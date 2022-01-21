const app = require("../../app");
const request = require("supertest");
const mongoose = require("mongoose");
const { DB_HOST } = process.env;

require("dotenv").config();
const { User } = require("../../model/user");

describe("test login", () => {
  let server;
  beforeAll(() => (server = app.listen(3000)));
  afterAll(() => server.close());

  beforeEach((done) => {
    mongoose.connect(DB_HOST).then(() => done());
  });

  afterEach((done) => {
    mongoose.connection.db.dropDatabase(() => {
      mongoose.connection.close(() => done());
    });
  });

  test("test login route", async () => {
    const loginData = {
      password: "master",
      email: "master@gmail.com",
    };

    const response = await request(app)
      .post("/api/users/login")
      .send(loginData);

    expect(response.statusCode).toBe(200);

    const user = await User.findOne(response.body);
    expect(user.email).toBe(loginData.email);
    expect(user.subscription).toBe("starter");
    expect(user.token).toBeTruthy();
  });
});
