import {DBClient} from '../../src/index'
import {describe, expect, it} from '@jest/globals'
import {DEFAULT_VALUES} from '../../src/models'
import {
  ExecuteStatementCommand,
  BatchExecuteStatementCommand,
  DecimalReturnType
} from '@aws-sdk/client-rds-data'

const getConfig = () => {
  return {
    resourceArn: process.env.DB_SECRET_ARN,
    secretArn: process.env.DB_RESOURCE_ARN,
    database: process.env.DB_NAME
  }
}

describe('constructor', () => {
  it('secretArn & resourceArn is required', () => {
    const dbClient = new DBClient(getConfig())
    expect(dbClient.config.region).toEqual(DEFAULT_VALUES.REGION)
    expect(dbClient.config.maxAttempts).toEqual(DEFAULT_VALUES.RETRY_ATTEMPTS)
  })
})

describe('processParams', () => {
  const dbClient = new DBClient(getConfig())
  it('params not passed', () => {
    const params = dbClient.processParams(undefined)
    expect(params).toEqual([])
  })
  it('params as object', () => {
    const params = dbClient.processParams({repo: 'repo1', num: 10})
    const expected = [
      {name: 'repo', value: {stringValue: 'repo1'}},
      {name: 'num', value: {longValue: 10}}
    ]
    expect(params).toEqual(expect.arrayContaining(expected))
  })
  it('batch params', () => {
    const params = dbClient.processParams([
      {repo: 'repo1', num: 10},
      {repo: 'repo2', num: 20}
    ])
    expect(params.length).toBe(2)
    expect(params[0]).toEqual(
      expect.arrayContaining([
        {name: 'repo', value: {stringValue: 'repo1'}},
        {name: 'num', value: {longValue: 10}}
      ])
    )
    expect(params[1]).toEqual(
      expect.arrayContaining([
        {name: 'repo', value: {stringValue: 'repo2'}},
        {name: 'num', value: {longValue: 20}}
      ])
    )
  })
})

describe('formatGeneratedFields', () => {
  const dbClient = new DBClient(getConfig())
  it('for insert query', () => {
    const obj = dbClient.formatGeneratedFields([{longValue: 5}])
    expect(obj).toEqual([5])
  })
  it('for update query', () => {
    const obj = dbClient.formatGeneratedFields([])
    expect(obj).toEqual([])
  })
})

describe('formatResults', () => {
  const dbClient = new DBClient(getConfig())
  it('generatedFields: for insert query', () => {
    const obj = dbClient.formatResults({
      $metadata: {},
      generatedFields: [{longValue: 5}]
    })
    expect(obj.generatedIds).toEqual([5])
    expect(obj.$metadata).toEqual({})
    expect(obj.generatedFields).toEqual([{longValue: 5}])
  })
  it('generatedFields: for update query', () => {
    const obj = dbClient.formatResults({$metadata: {}, generatedFields: []})
    expect(obj.generatedIds).toEqual([])
    expect(obj.$metadata).toEqual({})
    expect(obj.generatedFields).toEqual([])
  })
  it('updateResults: for batch insert query', () => {
    const obj = dbClient.formatResults({
      $metadata: {},
      updateResults: [
        {
          generatedFields: [{longValue: 12}]
        },
        {
          generatedFields: [{longValue: 13}]
        },
        {
          generatedFields: [{longValue: 14}]
        }
      ]
    })
    expect(obj.generatedIds).toEqual([12, 13, 14])
    expect(obj.$metadata).toEqual({})
    expect(obj.updateResults).toEqual([
      {generatedFields: [{longValue: 12}]},
      {generatedFields: [{longValue: 13}]},
      {generatedFields: [{longValue: 14}]}
    ])
  })
  it('updateResults: for batch update query', () => {
    const obj = dbClient.formatResults({
      $metadata: {},
      updateResults: [
        {generatedFields: []},
        {generatedFields: []},
        {generatedFields: []}
      ]
    })
    expect(obj.generatedIds).toEqual([])
    expect(obj.$metadata).toEqual({})
    expect(obj.updateResults).toEqual([
      {generatedFields: []},
      {generatedFields: []},
      {generatedFields: []}
    ])
  })
  it('updateResults: for batch update query', () => {
    const records = [
      [
        {longValue: 1},
        {stringValue: 'repo1'},
        {stringValue: '2022-02-28 10:57:03'}
      ],
      [
        {longValue: 2},
        {stringValue: 'repo2'},
        {stringValue: '2022-02-28 10:58:05'}
      ],
      [
        {longValue: 3},
        {stringValue: 'repo3'},
        {stringValue: '2022-02-28 10:58:33'}
      ]
    ]
    const columnMetadata = [
      {label: 'id'},
      {label: 'repo'},
      {label: 'created_at'}
    ]

    const obj = dbClient.formatResults({
      $metadata: {},
      records,
      columnMetadata
    })
    expect(obj.recordObjects).toEqual([
      {id: 1, repo: 'repo1', created_at: '2022-02-28 10:57:03'},
      {id: 2, repo: 'repo2', created_at: '2022-02-28 10:58:05'},
      {id: 3, repo: 'repo3', created_at: '2022-02-28 10:58:33'}
    ])
    expect(obj.$metadata).toEqual({})
    expect(obj.records).toEqual(records)
    expect(obj.columnMetadata).toEqual(columnMetadata)
  })
})

describe('arrayToObject', () => {
  it('should generate object', () => {
    const dbClient = new DBClient(getConfig())
    const obj = dbClient.arrayToObject(['key1', 'key2'], [1, 'two', 3])
    expect(obj).toEqual({key1: 1, key2: 'two'})
  })
})

describe('formatRecords', () => {
  it('should return hydrated objects', () => {
    const dbClient = new DBClient(getConfig())
    const obj = dbClient.formatRecords(
      [
        [
          {longValue: 1},
          {stringValue: 'repo1'},
          {stringValue: '2022-02-28 10:57:03'}
        ],
        [
          {longValue: 2},
          {stringValue: 'repo1'},
          {stringValue: '2022-02-28 10:58:05'}
        ],
        [{longValue: 3}, {stringValue: 'repo1'}, {isNull: true}]
      ],
      [{label: 'id'}, {label: 'repo'}, {label: 'created_at'}]
    )
    expect(obj).toEqual([
      {id: 1, repo: 'repo1', created_at: '2022-02-28 10:57:03'},
      {id: 2, repo: 'repo1', created_at: '2022-02-28 10:58:05'},
      {id: 3, repo: 'repo1', created_at: null}
    ])
  })
})

describe('buildCommand', () => {
  it('DB configs are copied', () => {
    const SQL = 'select * from test'
    const resourceArn = 'resource_arn',
      secretArn = 'resource_arn',
      database = 'test_db'
    const dbClient = new DBClient({resourceArn, secretArn, database})
    const command = dbClient.buildCommand(SQL)
    const input = (command as ExecuteStatementCommand).input
    expect(input.sql).toEqual(SQL)
    expect(input.continueAfterTimeout).toBe(false)
    expect(input.resourceArn).toEqual(resourceArn)
    expect(input.secretArn).toEqual(secretArn)
    expect(input.database).toEqual(database)
    expect(input.parameters).toEqual([])
  })
  it('DB configs can be overwritten', () => {
    const dbClient = new DBClient(getConfig())
    const SQL = 'select * from test'
    const resourceArn = 'resource_arn',
      secretArn = 'resource_arn',
      database = 'test_db'
    const command = dbClient.buildCommand(SQL, {
      resourceArn,
      secretArn,
      database
    })
    const input = (command as ExecuteStatementCommand).input
    expect(input.sql).toEqual(SQL)
    expect(input.continueAfterTimeout).toBe(false)
    expect(input.resourceArn).toEqual(resourceArn)
    expect(input.secretArn).toEqual(secretArn)
    expect(input.database).toEqual(database)
    expect(input.parameters).toEqual([])
  })
  it('Params are processed for single query', () => {
    const dbClient = new DBClient(getConfig())
    const SQL = 'UPDATE test SET package_name = :pkg WHERE id = :id'
    const command = dbClient.buildCommand(SQL, {
      params: {id: 101, pkg: 'package1'}
    })
    const input = (command as ExecuteStatementCommand).input
    expect(input.sql).toEqual(SQL)
    expect(input.continueAfterTimeout).toBe(true)
    expect(input.parameters).toEqual(
      expect.arrayContaining([
        {name: 'pkg', value: {stringValue: 'package1'}},
        {name: 'id', value: {longValue: 101}}
      ])
    )
  })
  it('Params are processed for batch query', () => {
    const dbClient = new DBClient(getConfig())
    const SQL = 'UPDATE test SET package_name = :pkg WHERE id = :id'
    const command = dbClient.buildCommand(SQL, {
      params: [
        {id: 101, pkg: 'package1'},
        {id: 102, pkg: 'package2'}
      ]
    })
    const input = (command as BatchExecuteStatementCommand).input
    expect(input.sql).toEqual(SQL)
    expect(input.parameterSets?.length).toBe(2)
    expect(input.parameterSets).toEqual([
      [
        {name: 'id', value: {longValue: 101}},
        {name: 'pkg', value: {stringValue: 'package1'}}
      ],
      [
        {name: 'id', value: {longValue: 102}},
        {name: 'pkg', value: {stringValue: 'package2'}}
      ]
    ])
  })
  it('Valid params are passed', () => {
    const dbClient = new DBClient(getConfig())
    const SQL = 'DELETE FROM test where repo = :repo'
    const includeResultMetadata = true,
      resultSetOptions = {decimalReturnType: DecimalReturnType.STRING},
      continueAfterTimeout = false
    const params = {id: 101, pkg: 'package1'}
    const command = dbClient.buildCommand(SQL, {
      params,
      includeResultMetadata,
      resultSetOptions,
      continueAfterTimeout
    })
    const keys = Object.keys(command.input)
    expect(keys).toEqual(
      expect.arrayContaining([
        'sql',
        'resourceArn',
        'secretArn',
        'database',
        'includeResultMetadata',
        'resultSetOptions',
        'parameters'
      ])
    )
    const input = (command as ExecuteStatementCommand).input
    expect(input.sql).toEqual(SQL)
    expect(input.continueAfterTimeout).toBe(continueAfterTimeout)
    expect(input.includeResultMetadata).toBe(includeResultMetadata)
    expect(input.resultSetOptions).toBe(resultSetOptions)
    expect(input.parameters).toEqual(
      expect.arrayContaining([
        {name: 'pkg', value: {stringValue: 'package1'}},
        {name: 'id', value: {longValue: 101}}
      ])
    )
  })
  it('Unnecessary params are omitted', () => {
    const dbClient = new DBClient(getConfig())
    const SQL = 'DELETE FROM test where repo = :repo'
    const includeResultMetadata = true,
      resultSetOptions = {decimalReturnType: DecimalReturnType.STRING},
      continueAfterTimeout = true
    const params = [
      {id: 101, pkg: 'package1'},
      {id: 102, pkg: 'package2'}
    ]
    const command = dbClient.buildCommand(SQL, {
      params,
      includeResultMetadata,
      resultSetOptions,
      continueAfterTimeout
    })
    const keys = Object.keys(command.input)
    expect(keys).toEqual(
      expect.arrayContaining([
        'sql',
        'resourceArn',
        'secretArn',
        'database',
        'parameterSets'
      ])
    )
    expect(keys).toEqual(
      expect.not.arrayContaining([
        'includeResultMetadata',
        'resultSetOptions',
        'continueAfterTimeout',
        'parameters'
      ])
    )
  })
  it('Batch execution not supported for SELECT query', () => {
    const dbClient = new DBClient(getConfig())
    const SQL = 'SELECT * FROM test WHERE repo = :repo'
    expect(() => {
      dbClient.buildCommand(SQL, {params: [{repo: 'test-repo'}]})
    }).toThrowError(/^Batch execution is only supported for DML queries$/)
  })
})

describe('isDMLQuery', () => {
  const dbClient = new DBClient(getConfig())
  it('for select', () => {
    const bDML = dbClient.isDMLQuery(' select * from test ')
    expect(bDML).toBe(false)
  })
  it('for insert', () => {
    const bDML = dbClient.isDMLQuery(
      ' Insert into test (repo,package_name) values(:repo,:package_name) '
    )
    expect(bDML).toBe(true)
  })
  it('for update', () => {
    const bDML = dbClient.isDMLQuery(
      ' UPDATE test SET package_name = :pkg WHERE repo = :repo '
    )
    expect(bDML).toBe(true)
  })
  it('for delete', () => {
    const bDML = dbClient.isDMLQuery(' delete from test where repo = :repo ')
    expect(bDML).toBe(true)
  })
})
