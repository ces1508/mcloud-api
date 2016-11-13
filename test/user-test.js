'use strict'

import test from 'ava'
import micro from 'micro'
// import uuid from 'uuid-base62'
import listen from 'test-listen'
import request from 'request-promise'
import users from '../users'
import fixtures from './fixtures/'

test.beforeEach(async t => {
  let srv = micro(users)
  t.context.url = await listen(srv)
})

test('POST /create', async t => {
  let user = fixtures.getUser()
  let url = t.context.url
  let options = {
    method: 'POST',
    uri: `${url}/create`,
    json: true,
    body: {
      email: user.email,
      password: user.password,
      company: user.company
    },
    resolveWithFullResponse: true
  }
  let response = await request(options)
  delete user.email
  delete user.password
  t.is(response.statusCode, 201)
  t.deepEqual(response.body, user)
})
