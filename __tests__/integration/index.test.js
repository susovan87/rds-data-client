import { DBClient } from '../../src/index'
import { describe, expect, it } from '@jest/globals'

const getConfig = () => {
  return {
    resourceArn: process.env.DB_SECRET_ARN,
    secretArn: process.env.DB_RESOURCE_ARN,
    database: process.env.DB_NAME
  }
}

// The tests are validated against MySql Employees Sample Database: https://dev.mysql.com/doc/employee/en/
describe("DBClient", () => {

  describe("query", () => {
    const dbClient = new DBClient(getConfig());
    
    it("select query return hydrated data", async () => {
      const data = await dbClient.query('SELECT * FROM employees where first_name = :first_name', { params: { first_name: 'test' } });
      console.log(data);
    });

  });

});