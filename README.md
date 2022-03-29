# RDS Data Client
A lightweight wrapper on `@aws-sdk/client-rds-data` that simplifies working with the Amazon Aurora Serverless Data API. This library is inspired by [jeremydaly/data-api-client](https://github.com/jeremydaly/data-api-client). Here are the key benifits of using this library over others.
- **Simplified input params & output records**: It enhances functionality of AWS SDK Javascript v3 library `@aws-sdk/client-rds-data` by abstracting away the notion of field values. It ease supplying named params in native JavaScript types and also converts return records in native JavaScript types. See the examples below for more details.
- **Custom retries for DB connection failures**: Custom retry strategy to handle DB connect timeout. This is extremely useful cater infrequest uses pattern (pause compute capacity on inactivity to save cost). Find the details on the issue [aws/aws-sdk-js-v3 #3425](https://github.com/aws/aws-sdk-js-v3/issues/3425).
- **[TBD] Proactive wakeup request**: Support for proactive wakeup-request to RDS to minimize waiting time when RDS is paused due to inactivity. It could save compute time & cost. ([TDB #1](https://github.com/susovan87/rds-data-client/issues/1))
- **Extended functionality without any overlapping**: The library let you access every feature of `@aws-sdk/client-rds-data`, while extended few essential funcationality without overlapping. So, no restriction on advance use-cases. That means you can still pass the [parameters](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-rds-data/interfaces/executestatementcommandinput.html#parameters) or [parameterSets](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-rds-data/interfaces/batchexecutestatementcommandinput.html#parametersets) as query options to send named parameters in native AWS SDK format and get [records](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-rds-data/interfaces/executestatementcommandoutput.html#records) as output. Though the library will accept additional query option `params` for simplified named parameter in native Javascript types and inject fields like `recordObjects` or `generatedIds` inside query output. Find more on examples below
- **Typescript support**: So, you will get hint on what each method accepts and output.
- **Recommended option injection**: Automatically inject `continueAfterTimeout: true` option for DML queries as [recommended by AWS](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-rds-data/interfaces/executestatementcommandinput.html#continueaftertimeout). Though you many override this via query options.



## Installation
```bash
npm i @susovan87/rds-data-client
```

## Simple Examples
You can simply instantiate the `DBClient` with required configuration and use `query()` method to execute SQL queries.
```javascript
import {DBClient} from '@susovan87/rds-data-client'
const dbClient = new DBClient({
  secretArn: 'arn:aws:secretsmanager:us-east-1:XXXXXXXXXXXX:secret:mySecret',
  resourceArn: 'arn:aws:rds:us-east-1:XXXXXXXXXXXX:cluster:my-cluster-name',
  database: 'myDatabase' // default database
});

// Simple SELECT
const data = await dbClient.query('SELECT * FROM myTable');
console.log(data.recordObjects)

// SELECT with named parameters
const resultParams = await dbClient.query(
  `SELECT * FROM myTable WHERE id = :id`,
  { params: { id: 2 } }
);
console.log(resultParams.recordObjects)
// Output: [ { id: 2, name: 'Mike', age: 52 } ]

// INSERT with named parameters
const insert = await dbClient.query(
  `INSERT INTO myTable (name,age,has_curls) VALUES(:name,:age,:curls)`,
  { params: { name: 'Greg', age: 18, curls: false } }
)
console.log(insert.generatedIds)
// Output: [ 4 ]

// BATCH INSERT with named parameters
const batchInsert = await dbClient.query(
  `INSERT INTO myTable (name,age,has_curls) VALUES(:name,:age,:curls)`,
  {
    params: [
      { name: 'Marcia', age: 17, curls: false },
      { name: 'Peter', age: 15, curls: false },
      { name: 'Jan', age: 15, curls: false },
      { name: 'Cindy', age: 12, curls: true },
      { name: 'Bobby', age: 12, curls: false }
    ]
  }
)
console.log(batchInsert.generatedIds)
// Output: [ 5, 6, 7, 8, 9 ]

// Update with named parameters
const update = await dbClient.query(
  `UPDATE myTable SET age = :age WHERE id = :id`,
  { params: { age: 13, id: 5 } }
)
console.log(update.numberOfRecordsUpdated)
// Output: 1

// Delete with named parameters
const remove = await dbClient.query(
  `DELETE FROM myTable WHERE name = :name`,
  { params: { name: 'Jan' } }
)
console.log(update.numberOfRecordsUpdated)
// Output: 1

// A slightly more advanced example
let custom = await dbClient.query(`SELECT * FROM myOtherTable WHERE isActive = :isActive`,
  {
    params: { isActive: true },
    database: 'myOtherDatabase',
    continueAfterTimeout: true
  })
console.log(custom.recordObjects);
// Output: [
//  { id: 1, name: 'Marcia', DOB: null, weight: 81.8, bio: 'I am a Teacher', isActive: true, createdAt: '2022-03-29 04:41:33' },
//  { id: 2, name: 'Peter', DOB: '2008-07-04', weight: null, bio: 'I am a Student', isActive: true, createdAt: '2022-03-29 04:41:33' }
//]
```

## How it is better than vanilla AWS SDK?
The `RDSDataClient` requires you to specify data types when passing in parameters. The basic INSERT example above would look like this using this
```javascript
import { RDSDataClient } from '@aws-sdk/client-rds-data'
const client = new RDSDataClient({ region: 'us-east-1' })

// INSERT with named parameters
let insert = await client.send({
  secretArn: 'arn:aws:secretsmanager:us-east-1:XXXXXXXXXXXX:secret:mySecret',
  resourceArn: 'arn:aws:rds:us-east-1:XXXXXXXXXXXX:cluster:my-cluster-name',
  database: 'myDatabase',
  sql: 'INSERT INTO myTable (name,age,has_curls) VALUES(:name,:age,:curls)',
  parameters: [
    { name: 'name', value: { stringValue: 'Cousin Oliver' } },
    { name: 'age', value: { longValue: 10 } },
    { name: 'curls', value: { booleanValue: false } }
  ]
)
```
Specifying all of those data types in the parameters is a bit clunky. In addition to requiring types for parameters, it also returns each field as an object with its value assigned to a key that represents its data type, like this:
```json
{ // id field
  "longValue": 9
},
{ // name field
  "stringValue": "Cousin Oliver"
},
{ // age field
  "longValue": 10
},
{ // has_curls field
  "booleanValue": false
}
```
Not only are there no column names, but you have to pull the value from the data type field. Lots of extra work this library automatically handles for you.


## Transaction Support
Generate a `transactionId` by calling `startTransaction()` and pass the `transactionId` into every `query()` options that are part of same transaction. And the just call `commit()` or `rollback()` method with the same `transactionId` to either commit or rollback the transaction.
```javascript
let transactionId;
try {
  transactionId = await dbClient.startTransaction()

  const insert = await dbClient.query(
    `INSERT INTO myTable (name,age,has_curls) VALUES(:name,:age,:curls)`,
    { params: { name: 'Smith', age: 18, curls: false } },
    transactionId
  )
  console.log(`Successfully inserted with generatedIds: ${insert?.generatedIds}`)

  const update = await dbClient.query(
    `UPDATE myTable SET age = :age WHERE name = :name`,
    { params: { name: 'Smith', age: 81 } },
    transactionId
  )
  const status = await dbClient.commit(transactionId)
  console.log('Commit transaction status:', status)

} catch (error) {
  console.error(error)
  const status = await dbClient.rollback(transactionId)
  console.log('Rollback transaction status:', status)
}
```

## Contributions
Contributions, ideas and bug reports are welcome and greatly appreciated. Please add [issues](https://github.com/susovan87/rds-data-client/issues) for suggestions and bug reports or create a pull request.