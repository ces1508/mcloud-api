import test from 'ava'
import micro from 'micro'
// import uuid from 'uuid-base62'
import listen from 'test-listen'
import request from 'request-promise'
import template from '../templateEmails'
import fixtures from './fixtures/'
import utils from '../lib/utils'
import config from '../config'

test.beforeEach(async t => {
  let srv = micro(template)
  t.context.url = await listen(srv)
})

test('POST /create ', async t => {
  let template = fixtures.getTemplate()
  let url = t.context.url
  let token = await utils.signToken({userId: `${template.userId}`}, config.secret)
  let options = {
    method: 'POST',
    uri: `${url}/create`,
    body: template,
    json: true
  }
  t.throws(request(options), /unAuthorized/)
  options = {
    method: 'POST',
    uri: `${url}/create`,
    body: template,
    json: true,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
  let body = await request(options)
  t.deepEqual(body, template)
})

test('GET /', async t => {
  let url = t.context.url
  let templates = fixtures.getTemplates()
  let token = await utils.signToken({userId: templates[0].userId}, config.secret)
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
  t.is(templates.length, body.length)
})
test('PATCH /:id', async t => {
  let url = t.context.url
  let template = fixtures.getTemplate()
  let options = {
    url: `${url}/${template.id}`,
    method: 'PATCH',
    body: template,
    json: true
  }
  t.throws(request(options), /unAuthorized/)
  let token = await utils.signToken({userId: template.userId}, config.secret)
  options = {
    url: `${url}/${template.id}`,
    method: 'PATCH',
    body: template,
    headers: {
      'Authorization': `Bearer ${token}`
    },
    json: true
  }
  let body = await request(options)
  t.deepEqual(template, body)
})
test('GET /:id', async t => {
  let template = fixtures.getTemplate()
  let token = await utils.signToken({userId: template.userId}, config.secret)
  let url = t.context.url
  let options = {
    url: `${url}/${template.id}`,
    method: 'GET',
    body: template,
    json: true,
    headers: {
      'Authorization': `Bearer ${token}0001`
    }
  }
  t.throws(request(options), /unAuthorized/)
  options = {
    url: `${url}/${template.id}`,
    method: 'GET',
    body: template,
    headers: {
      'Authorization': `Bearer ${token}`
    },
    json: true
  }
  let body = await request(options)
  t.deepEqual(template, body)
})
test('DELETE /:id', async t => {
  let template = fixtures.getTemplate()
  let token = await utils.signToken({userId: template.userId}, config.secret)
  let url = t.context.url
  let options = {
    url: `${url}/${template.id}`,
    method: 'DELETE',
    json: true,
    headers: {
      'Authorization': `Bearer ${token}0001`
    }
  }
  t.throws(request(options), /unAuthorized/)
  options = {
    url: `${url}/${template.id}`,
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    json: true
  }
  let body = await request(options)
  t.is(1, body.deleted)
})
