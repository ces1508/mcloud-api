import test from 'ava'
import micro from 'micro'
// import uuid from 'uuid-base62'
import listen from 'test-listen'
import request from 'request-promise'
import databases from '../databases'
import fixtures from './fixtures/'
import utils from '../lib/utils'
import config from '../config'

test.beforeEach(async t => {
  let srv = micro(databases)
  t.context.url = await listen(srv)
})

test('POST /create ', async t => {
  let database = fixtures.getDatabase()
  let url = t.context.url
  let token = await utils.signToken({userId: `${database.userId}`}, config.secret)
  let options = {
    method: 'POST',
    uri: `${url}/create`,
    body: database,
    json: true
  }
  t.throws(request(options), /unAuthorized/)
  options = {
    method: 'POST',
    uri: `${url}/create`,
    body: database,
    json: true,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
  let body = await request(options)
  t.deepEqual(body, database)
})

test('GET /', async t => {
  let url = t.context.url
  let databases = fixtures.getDatabases()
  let token = await utils.signToken({userId: databases[0].userId}, config.secret)
  let options = {
    url: url,
    method: 'GET',
    headers: {
    },
    json: true
  }
  t.throws(request(options), /unAuthorized/)
  options = {
    url: url,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    json: true
  }
  let body = await request(options)
  t.is(databases.length, body.length)
})
test('PATCH /:id', async t => {
  let url = t.context.url
  let database = fixtures.getDatabase()
  let options = {
    url: `${url}/${database.id}`,
    method: 'PATCH',
    body: database,
    json: true
  }
  t.throws(request(options), /unAuthorized/)
  let token = await utils.signToken({userId: database.userId}, config.secret)
  options = {
    url: `${url}/${database.id}`,
    method: 'PATCH',
    body: database,
    headers: {
      'Authorization': `Bearer ${token}`
    },
    json: true
  }
  let body = await request(options)
  t.deepEqual(database, body)
})
test('GET /:id', async t => {
  let database = fixtures.getDatabase()
  let token = await utils.signToken({userId: database.userId}, config.secret)
  let url = t.context.url
  let options = {
    url: `${url}/${database.id}`,
    method: 'GET',
    body: database,
    json: true,
    headers: {
      'Authorization': `Bearer ${token}0001`
    }
  }
  t.throws(request(options), /unAuthorized/)
  options = {
    url: `${url}/${database.id}`,
    method: 'GET',
    body: database,
    headers: {
      'Authorization': `Bearer ${token}`
    },
    json: true
  }
  let body = await request(options)
  t.deepEqual(database, body)
})
test('DELETE /:id', async t => {
  let database = fixtures.getDatabases()
  let id = database[0].id
  let token = await utils.signToken({userId: database[0].userId}, config.secret)
  let url = t.context.url
  let options = {
    url: `${url}/${id}`,
    method: 'DELETE',
    json: true,
    headers: {
      'Authorization': `Bearer ${token}0001`
    }
  }
  t.throws(request(options), /unAuthorized/)
  options = {
    url: `${url}/${id}`,
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    json: true
  }
  let body = await request(options)
  t.is(database.length, body.length)
})
