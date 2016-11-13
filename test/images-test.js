'use strict'

import test from 'ava'
import micro from 'micro'
// import uuid from 'uuid-base62'
import listen from 'test-listen'
import request from 'request-promise'
import images from '../images'
import fixtures from './fixtures/'
import utils from '../lib/utils'
import config from '../config'

test.beforeEach(async t => {
  let srv = micro(images)
  t.context.url = await listen(srv)
})
test('GET /images/:id', async t => {
  let image = fixtures.getImage()
  let url = t.context.url
  let body = await request({uri: `${url}/images/${image.id}`, json: true})
  t.deepEqual(body, image)
})

test('no token post /create', async t => {
  let image = fixtures.getImage()
  let url = t.context.url
  let options = {
    method: 'POST',
    uri: `${url}/images/upload`,
    json: true,
    body: {
        url: image.url,
        userId: image.userId
    },
    resolveWithFullResponse: true
  }
  t.throws(request(options), /unauthorized/)
})

test('secure post /create', async t => {
  let image = fixtures.getImage()
  let url = t.context.url
  let token = await utils.signToken({userId:image.userId}, config.secret)
  let options = {
    method: 'POST',
    uri: `${url}/images/upload`,
    json: true,
    body: {
        url: image.url,
        userId: image.userId
    },
    headers: {
      'Authorization': `Bearer ${token}`
    },
    resolveWithFullResponse: true
  }
  let response = await request(options)
  t.is(response.statusCode, 201)
  t.deepEqual(image, response.body)
})

test('invalid token  post /create', async t => {
  let image = fixtures.getImage()
  let url = t.context.url
  let token = await utils.signToken({userId: 'invalid token'}, config.secret)
  let options = {
    method: 'POST',
    uri: `${url}/images/upload`,
    json: true,
    body: {
        url: image.url,
        userId: image.userId
    },
    headers: {
      'Authorization': `Bearer ${token}`
    },
    resolveWithFullResponse: true
  }
  t.throws(request(options), /unauthorized/)
})

test('GET /images/', async t => {
  let url = t.context.url
  let images = fixtures.getImages()
  let token = await utils.signToken({userId: `${images[0].userId}`}, config.secret)
  let options = {
    method: 'GET',
    uri: `${url}/images/list`,
    json: true,
    headers : {
      'Authorization': `Bearer ${token}`
    }
  }
  let body = await request(options)
  t.deepEqual(body, images)
})
