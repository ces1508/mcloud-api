'use strict'

import test from 'ava'
import micro from 'micro'
// import uuid from 'uuid-base62'
import listen from 'test-listen'
import request from 'request-promise'
import auth from '../auth'
import fixtures from './fixtures/'
import config from '../config'
import utils from '../lib/utils'
test.beforeEach(async t => {
  let srv = micro(auth)
  t.context.url = await listen(srv)
})

test('sucess POST /', async t => {
  let user = fixtures.getUser()
  let url = t.context.url

  let options = {
    method: 'POST',
    uri: `${url}/auth`,
    body: {
      username: user.email,
      password: user.password
    },
    json: true
  }
  let token = await request(options)
  let decoded = await utils.verifyToken(token, config.secret)
  t.is(user.email, decoded.email)
})
