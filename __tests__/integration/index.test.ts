import {DBClient} from '../../src/index'
import {describe, expect, it} from '@jest/globals'

const getConfig = () => {
  return {
    resourceArn: process.env.DB_RESOURCE_ARN,
    secretArn: process.env.DB_SECRET_ARN,
    database: process.env.DB_NAME
  }
}

// The tests are validated against MySql Employees Sample Database: https://dev.mysql.com/doc/employee/en/
describe('DBClient', () => {
  describe('query', () => {
    const dbClient = new DBClient(getConfig())

    it('select query return hydrated data', async () => {
      const data = await dbClient.query(
        'SELECT * FROM employees where first_name = :first_name',
        {params: {first_name: 'test'}}
      )
      console.log(data)
    })

    it('select query without parameter', async () => {
      const data = await dbClient.query(
        'SELECT * FROM dependencies LIMIT 100',
        {database: 'dependency_info'}
      )
      console.log(data.recordObjects)
    })

    it('insert query', async () => {
      const data = await dbClient.query(
        `INSERT INTO dependencies (repo,dependency_source,package_manager,package_name,is_direct) VALUES(:repo,:dependency_source,:package_manager,:package_name,:is_direct)`,
        {
          params: {
            repo: 'test-repo',
            dependency_source: '',
            package_manager: 'test',
            package_name: 'test-pkg-1',
            is_direct: true
          },
          database: 'dependency_info'
        }
      )
      expect(Array.isArray(data?.generatedIds)).toBe(true)
      expect(data?.generatedIds?.length).toBe(1)
      console.log(
        `Successfully inserted with generatedIds: ${data?.generatedIds}`
      )
    })

    it('batch insert query', async () => {
      const data = await dbClient.query(
        `INSERT INTO dependencies (repo,dependency_source,package_manager,package_name,is_direct) VALUES(:repo,:dependency_source,:package_manager,:package_name,:is_direct)`,
        {
          params: [
            {
              repo: 'test-repo',
              dependency_source: '',
              package_manager: 'test',
              package_name: 'test-pkg-11',
              is_direct: true
            },
            {
              repo: 'test-repo',
              dependency_source: '',
              package_manager: 'test',
              package_name: 'test-pkg-12',
              is_direct: true
            },
            {
              repo: 'test-repo',
              dependency_source: '',
              package_manager: 'test',
              package_name: 'test-pkg-13',
              is_direct: false
            }
          ],
          database: 'dependency_info'
        }
      )
      expect(Array.isArray(data?.generatedIds)).toBe(true)
      expect(data?.generatedIds?.length).toBe(3)
      console.log(
        `Successfully inserted with generatedIds: ${data?.generatedIds}`
      )
    })

    it('update query', async () => {
      const data = await dbClient.query(
        'UPDATE dependencies SET is_direct = :is_direct WHERE package_name = :pkg',
        {
          params: {pkg: 'test-pkg-11', is_direct: false},
          database: 'dependency_info'
        }
      )
      console.log(`Successfully updated '${data?.numberOfRecordsUpdated}' rows`)
    })

    it('batch update query', async () => {
      const data = await dbClient.query(
        'UPDATE dependencies SET is_direct = :is_direct WHERE package_name = :pkg',
        {
          params: [
            {pkg: 'test-pkg-11', is_direct: false},
            {pkg: 'test-pkg-12', is_direct: false}
          ],
          database: 'dependency_info'
        }
      )
      console.log(data)
    })

    it('delete query', async () => {
      const data = await dbClient.query(
        'DELETE FROM dependencies where package_name = :package_name',
        {params: {package_name: 'test-pkg-11'}, database: 'dependency_info'}
      )
      console.log(`Successfully deleted '${data?.numberOfRecordsUpdated}' rows`)
    })

    it('batch delete query', async () => {
      const data = await dbClient.query(
        'DELETE FROM dependencies where package_name = :package_name',
        {
          params: [
            {package_name: 'test-pkg-12'},
            {package_name: 'test-pkg-13'}
          ],
          database: 'dependency_info'
        }
      )
      console.log(`Successfully deleted '${data?.numberOfRecordsUpdated}' rows`)
      console.log(data)
    })
  })

  describe('transaction', () => {
    const dbClient = new DBClient(getConfig())
    it('with commit', async () => {
      let transactionId
      try {
        transactionId = await dbClient.startTransaction({
          database: 'dependency_info'
        })
        console.log('transactionId:', transactionId)
        const data = await dbClient.query(
          `INSERT INTO dependencies (repo,dependency_source,package_manager,package_name,is_direct) VALUES(:repo,:dependency_source,:package_manager,:package_name,:is_direct)`,
          {
            params: [
              {
                repo: 'test-repo',
                dependency_source: '',
                package_manager: 'test',
                package_name: 'test-pkg-11',
                is_direct: true
              },
              {
                repo: 'test-repo',
                dependency_source: '',
                package_manager: 'test',
                package_name: 'test-pkg-12',
                is_direct: true
              },
              {
                repo: 'test-repo',
                dependency_source: '',
                package_manager: 'test',
                package_name: 'test-pkg-13',
                is_direct: false
              }
            ],
            database: 'dependency_info',
            transactionId
          }
        )
        console.log(
          `Successfully inserted with generatedIds: ${data?.generatedIds}`
        )
        await dbClient.query(
          'DELETE FROM dependencies where package_name = :package_name',
          {
            params: [
              {package_name: 'test-pkg-11'},
              {package_name: 'test-pkg-12'},
              {package_name: 'test-pkg-13'}
            ],
            database: 'dependency_info',
            transactionId
          }
        )
        const status = await dbClient.commit(transactionId)
        console.log('Commit transaction status:', status)
      } catch (error) {
        console.error(error)
        const status = await dbClient.rollback(transactionId)
        console.log('Rollback transaction status:', status)
      }
      const data = await dbClient.query(
        'SELECT * FROM dependencies where repo = :repo',
        {params: {repo: 'test-repo'}, database: 'dependency_info'}
      )
      console.log(data.recordObjects)
    })

    it('with rollback', async () => {
      let transactionId
      try {
        transactionId = await dbClient.startTransaction({
          database: 'dependency_info'
        })
        console.log('transactionId:', transactionId)
        const data = await dbClient.query(
          `INSERT INTO dependencies (repo,dependency_source,package_manager,package_name,is_direct) VALUES(:repo,:dependency_source,:package_manager,:package_name,:is_direct)`,
          {
            params: [
              {
                repo: 'test-repo',
                dependency_source: '',
                package_manager: 'test',
                package_name: 'test-pkg-11',
                is_direct: true
              },
              {
                repo: 'test-repo',
                dependency_source: '',
                package_manager: 'test',
                package_name: 'test-pkg-12',
                is_direct: true
              },
              {
                repo: 'test-repo',
                dependency_source: '',
                package_manager: 'test',
                package_name: 'test-pkg-13',
                is_direct: false
              }
            ],
            database: 'dependency_info',
            transactionId
          }
        )
        console.log(
          `Successfully inserted with generatedIds: ${data?.generatedIds}`
        )
        await dbClient.query(
          'UPDATE dependencies SET is_direct = :is_direct WHERE package_name = :pkg',
          {
            params: [
              {pkg: 'test-pkg-11', is_direct: false},
              {pkg: 'test-pkg-12', is_direct: false}
            ],
            database: 'dependency_info',
            transactionId
          }
        )
      } finally {
        const status = await dbClient.rollback(transactionId)
        console.log('Rollback transaction status:', status)
      }
      const data = await dbClient.query(
        'SELECT * FROM dependencies where repo = :repo',
        {params: {repo: 'test-repo'}, database: 'dependency_info'}
      )
      console.log(data.recordObjects)
    })
  })
})
