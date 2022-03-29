import { DBClient } from '@susovan87/rds-data-client'

const getConfig = () => {
  return {
    resourceArn: process.env.DB_RESOURCE_ARN,
    secretArn: process.env.DB_SECRET_ARN,
    database: process.env.DB_NAME
  }
}
const dbClient = new DBClient(getConfig());

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