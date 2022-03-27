import {
  RDSDataClientConfig, BatchExecuteStatementCommandOutput, BeginTransactionCommandOutput,
  CommitTransactionCommandOutput, ExecuteSqlCommandOutput, ExecuteStatementCommandOutput,
  RollbackTransactionCommandOutput, SqlParameter, ResultSetOptions
} from "@aws-sdk/client-rds-data";

export interface DBClientConfig extends RDSDataClientConfig {
  resourceArn: string | undefined;
  secretArn: string | undefined;
  database?: string;
  schema?: string;
  maxAttempts?: number;
}

export type DBFieldType = (boolean | string | number | Uint8Array | boolean[] | string[] | number[] | undefined | null);

export type DBField = {
  [key: string]: DBFieldType;
}

export interface OutputTypes extends BatchExecuteStatementCommandOutput, BeginTransactionCommandOutput,
  CommitTransactionCommandOutput, ExecuteSqlCommandOutput, ExecuteStatementCommandOutput, RollbackTransactionCommandOutput {
  recordObjects?: DBField[]
  generatedIds?: DBFieldType[]
}

export interface QueryOptions {
  // Simplified query params as key-value pair
  params?: DBField | DBField[];

  // Incase you want to override for a particular query
  resourceArn?: string;
  secretArn?: string;
  database?: string;
  schema?: string;

  // Native parameters
  parameters?: SqlParameter[];

  // Will be enabled by default for SELECT queries
  includeResultMetadata?: boolean;

  // Will be enabled for DML queries by default as recommended by AWS
  // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-rds-data/interfaces/executestatementcommandinput.html#continueaftertimeout 
  continueAfterTimeout?: boolean;

  // Options that control how the result set is returned.
  resultSetOptions?: ResultSetOptions;

  // Native parameterSets for batch queries
  parameterSets?: SqlParameter[][];

  // Pass if SQL statement is not part of a transaction
  transactionId?: string;
}

export const DEFAULT_VALUES = {
  RETRY_ATTEMPTS: 10,
  LOGGER: console,
  REGION: 'us-east-1'
}

