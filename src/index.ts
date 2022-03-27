import {
  RDSDataClient, BatchExecuteStatementCommand, ExecuteStatementCommand,
  BeginTransactionCommand, CommitTransactionCommand, RollbackTransactionCommand,
  ColumnMetadata, Field, SqlParameter, ServiceOutputTypes, ExecuteStatementCommandOutput,
  ExecuteStatementCommandInput, BatchExecuteStatementCommandInput,
} from "@aws-sdk/client-rds-data";
import { DBClientConfig, DEFAULT_VALUES, DBField, DBFieldType, OutputTypes, QueryOptions } from './models'
import { isArray, isObject, isDate, omit, pick } from 'underscore';
import { StandardRetryStrategy, defaultRetryDecider } from "@aws-sdk/middleware-retry"
import { Provider } from "@aws-sdk/types"

const error = (...err: any[]) => { throw new Error(...err) }

export class DBClient {
  readonly config: DBClientConfig;
  private _client: RDSDataClient;

  constructor(options: DBClientConfig) {
    this.config = Object.assign({
      logger: DEFAULT_VALUES.LOGGER,
      region: DEFAULT_VALUES.REGION,
      maxAttempts: DEFAULT_VALUES.RETRY_ATTEMPTS,
    }, options);
    this.config.retryStrategy = options.retryStrategy || this.getDefaultRetryStrategy(this.config);
    // Refer: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-rds-data/interfaces/rdsdataclientconfig.html
    this._client = new RDSDataClient(omit(this.config, ['resourceArn', 'secretArn', 'database', 'schema']))
  }

  private getDefaultRetryStrategy(options: DBClientConfig): StandardRetryStrategy {
    const maxAttempts = options.maxAttempts || DEFAULT_VALUES.RETRY_ATTEMPTS;
    const maxAttemptsProvider: Provider<number> = async () => maxAttempts;
    return new StandardRetryStrategy(maxAttemptsProvider, {
      retryDecider: (err) => {
        if (err && err.name === 'BadRequestException'
          && err.message.match(/^Communications link failure/)
          && err.$metadata?.httpStatusCode === 400) {
          return true;
        }

        return defaultRetryDecider(err);
      }
    });
  }

  async query(query: string, options: QueryOptions = {}) {
    const command = this.buildCommand(query, options);
    const data = await this._client.send(command);
    return this.formatResults(data);
  }

  buildCommand(query: string, options: QueryOptions = {}): (ExecuteStatementCommand | BatchExecuteStatementCommand) {
    const { params, parameterSets, parameters } = options
    const processedParams = parameterSets ?? parameters ?? this.processParams(params);
    const isBatch = processedParams.length > 0 && isArray(processedParams[0]);
    let command: BatchExecuteStatementCommand | ExecuteStatementCommand;
    if (isBatch) {
      let commandInput: BatchExecuteStatementCommandInput = Object.assign({ sql: query },
        pick(this.config, ['resourceArn', 'secretArn', 'database', 'schema']),
        omit(options, ['params', 'parameters', 'includeResultMetadata', 'resultSetOptions', 'continueAfterTimeout']),
        { parameterSets: processedParams }
      )
      command = new BatchExecuteStatementCommand(commandInput)
    } else {
      let commandInput: ExecuteStatementCommandInput = Object.assign(
        { sql: query, continueAfterTimeout: this.isDMLQuery(query) },
        pick(this.config, ['resourceArn', 'secretArn', 'database', 'schema']),
        omit(options, ['params', 'parameterSets']),
        { parameters: processedParams })
      command = new ExecuteStatementCommand(commandInput)
    }
    return command;
  }

  async startTransaction() {
    const command = new BeginTransactionCommand(pick(this.config, ['resourceArn', 'secretArn', 'database', 'schema']));
    const { transactionId } = await this._client.send(command);
    return transactionId
  }

  async commit(transactionId: string) {
    if (!transactionId) error('transactionId is a required parameter');
    const command = new CommitTransactionCommand(Object.assign({ transactionId }, pick(this.config, ['resourceArn', 'secretArn', 'database', 'schema'])))
    const { transactionStatus } = await this._client.send(command);
    return transactionStatus
  }

  async rollback(transactionId: string) {
    if (!transactionId) error('transactionId is a required parameter');
    const command = new RollbackTransactionCommand(Object.assign({ transactionId }, pick(this.config, ['resourceArn', 'secretArn', 'database', 'schema'])))
    const { transactionStatus } = await this._client.send(command);
    return transactionStatus
  }

  isDMLQuery(query: string): boolean {
    const QUERY = query.trim().toUpperCase();
    if (QUERY.startsWith('INSERT') || QUERY.startsWith('UPDATE') || QUERY.startsWith('DELETE')) {
      return true;
    }
    return false;
  }

  // Formats the results of a query response
  formatResults(result: ServiceOutputTypes): OutputTypes {
    let output: OutputTypes = Object.assign({}, result);
    if ('records' in result && 'columnMetadata' in result) {
      const { records, columnMetadata } = result as ExecuteStatementCommandOutput;
      output.recordObjects = this.formatRecords(records, columnMetadata);
    }

    if ('generatedFields' in result) {
      output.generatedIds = this.formatGeneratedFields(result.generatedFields);
    }

    if ('updateResults' in result && isArray(result.updateResults)) {
      output.generatedIds = result.updateResults.flatMap(({ generatedFields }) => this.formatGeneratedFields(generatedFields))
    }
    return output
  }

  private isExecuteStatementResponse(obj: ServiceOutputTypes): obj is ExecuteStatementCommandOutput {
    if (obj && ('records' in obj || 'columnMetadata' in obj || 'numberOfRecordsUpdated' in obj || 'generatedFields' in obj)) {
      return true;
    }
    return false;
  }

  formatGeneratedFields(generatedFields: Field[] = []): DBFieldType[] {
    if (isArray(generatedFields) && generatedFields.length > 0) {
      return generatedFields.map(field => Object.values(field)[0])
    }
    return []
  }

  arrayToObject = (keys: string[], values: any[]): DBField =>
    keys.reduce((acc, key, i) => (acc[key] = values[i], acc), <DBField>{});

  // Hydrate record with column name
  formatRecords(records: Field[][] | undefined, columnMetadata: ColumnMetadata[] = []): DBField[] {
    if (!records) return [];

    const keys = columnMetadata.map((colMeta: ColumnMetadata) => colMeta.label || colMeta.name || '');
    return records.map(row => {
      const values = row.map(obj => Object.values(obj)[0])
      return this.arrayToObject(keys, values)
    });
  }

  // Params: key-value or array
  processParams(params: DBField | DBField[] | undefined): (SqlParameter[] | SqlParameter[][]) {
    if (isArray(params)) {
      return params.map(p => this.toSqlParameter(p));
    } else {
      return this.toSqlParameter(params)
    }
  }

  toSqlParameter(params: DBField = {}): SqlParameter[] {
    let p = []
    for (const [key, value] of Object.entries(params)) {
      const param = {
        name: key,
        value: this.getSqlField(value),
      }
      p.push(param)
    }
    return p;
  }

  private isSqlParameter(obj: any): obj is SqlParameter {
    if (isObject(obj) && isObject(obj?.value)) {
      const keys = obj.value.keys;
      const typeName = ['stringValue', 'booleanValue', 'longValue', 'doubleValue', 'blobValue', 'arrayValues', '$unknown'];
      for (let i = 0; i < typeName.length; i++) {
        if (keys.includes(typeName[i])) {
          return true;
        }
      }
    }
    return false;
  }

  getSqlField(val: any): Field {
    if (typeof val === 'string') {
      return { stringValue: val }
    } else if (typeof val === 'boolean') {
      return { booleanValue: val }
    } else if (typeof val === 'number' && parseInt(val.toString()) === val) {
      return { longValue: val }
    } else if (typeof val === 'number' && parseFloat(val.toString()) === val) {
      return { doubleValue: val }
    } else if (isDate(val)) {
      return { stringValue: val.toString() }
    } else if (Buffer.isBuffer(val)) {
      return { blobValue: val }
    }
    return { stringValue: val }
  }
}