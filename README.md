# RDS Data Client
A lightweight wrapper on `@aws-sdk/client-rds-data` that simplifies working with the Amazon Aurora Serverless Data API. This library is inspired by [jeremydaly/data-api-client](https://github.com/jeremydaly/data-api-client). Here are the key benifits of using this library over others.
- It enhances functionality of AWS SDK Javascript v3 library `@aws-sdk/client-rds-data` by abstracting away the notion of field values. It ease supplying query params in native JavaScript types and also converts return records in native JavaScript types.
- Custom retry strategy to handle DB connect timeout. This is extremely useful cater infrequest uses pattern (pause compute capacity on inactivity to save cost).
- Support for proactive wakeup-ping to DB to minimize waiting time when DB is paused due to inactivity. It could save compute time & cost.
- Automatically inject `continueAfterTimeout: true` option for DML queries as recommended by AWS. Though you many override this via query options. 
- Typescript support
- The library let you access every feature of `@aws-sdk/client-rds-data`, while extended few essential funcationality without overlapping. So, no restriction on advance use-cases.

## Installation
```bash
npm i @susovan87/rds-data-client
```

## Simple Examples
You can simply instantiate the `DBClient` with required configuration and use `query` method to execute SQL queries.
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
// Output: [
//   { id: 1, name: 'Alice', age: null },
//   { id: 2, name: 'Mike', age: 52 },
//   { id: 3, name: 'Carol', age: 50 }
// ]

// SELECT with named parameters
const resultParams = await dbClient.query(
  `SELECT * FROM myTable WHERE id = :id`,
  {params: { id: 2 }}
);
console.log(resultParams.recordObjects)
// Output: [ { id: 2, name: 'Mike', age: 52 } ]

// INSERT with named parameters
const insert = await dbClient.query(
  `INSERT INTO myTable (name,age,has_curls) VALUES(:name,:age,:curls)`,
  {params: { name: 'Greg',   age: 18,  curls: false }}
)
console.log(insert.generatedIds)
// Output: [ 4 ]

// BATCH INSERT with named parameters
const batchInsert = await dbClient.query(
  `INSERT INTO myTable (name,age,has_curls) VALUES(:name,:age,:curls)`,
  {params: [
    { name: 'Marcia', age: 17,  curls: false },
    { name: 'Peter',  age: 15,  curls: false },
    { name: 'Jan',    age: 15,  curls: false },
    { name: 'Cindy',  age: 12,  curls: true  },
    { name: 'Bobby',  age: 12,  curls: false }
  ]}
)
console.log(insert.batchInsert)
// Output: [ 5, 6, 7, 8, 9 ]

// Update with named parameters
const update = await dbClient.query(
  `UPDATE myTable SET age = :age WHERE id = :id`,
  {params: { age: 13, id: 5 }}
)
console.log(update.numberOfRecordsUpdated)
// Output: 1

// Delete with named parameters
const remove = await dbClient.query(
  `DELETE FROM myTable WHERE name = :name`,
  {params: { name: 'Jan' }}
)
console.log(update.numberOfRecordsUpdated)
// Output: 1

// A slightly more advanced example
let custom = data.query(`SELECT * FROM myOtherTable WHERE id = :id AND active = :isActive`,
  {
    params: {id: 123, isActive: true},
    database: 'myOtherDatabase',
    continueAfterTimeout: true
  })
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



## Contributions
Contributions, ideas and bug reports are welcome and greatly appreciated. Please add [issues](https://github.com/susovan87/rds-data-client/issues) for suggestions and bug reports or create a pull request.