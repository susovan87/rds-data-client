import { DBClient } from '@susovan87/rds-data-client'

const getConfig = () => {
  return {
    resourceArn: process.env.DB_RESOURCE_ARN,
    secretArn: process.env.DB_SECRET_ARN,
    database: process.env.DB_NAME
  }
}
const dbClient = new DBClient(getConfig());

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
const data = await dbClient.query(
  'SELECT * FROM myTable WHERE name = :name',
  { params: { name: 'Smith' } }
)
console.log(data.recordObjects)
// Output: [ { id: 12, name: 'Smith', age: 81, has_curls: false } ]