'use strict'

import httpHash from 'http-hash'
import { send, json } from 'micro'
import Db from 'mepscloud-db'
import config from './config'
import DbStub from './test/stub/db'
import utils from './lib/utils'
// const env = process.env.NODE_ENV || 'test'
const env = 'production'
const hash = httpHash()
let db = new Db(config.db)

if (env === 'test') {
  db = new DbStub()
}

hash.set('POST /create', async function create (req, res, params) {
  let data = await json(req)
  let user = null
  try {
    let token = await utils.extractToken(req)
    user = await utils.verifyToken(token, config.secret)
  } catch (e) {
    console.error(e)
    return send(res, 401, 'unAuthorized')
  }
  await db.connect()
  data.userId = user.id
  let result = await db.create('templateEmails', data)
  await db.disconnet()
  send(res, 201, result)
})

hash.set('GET /page/:page', async function allTemplates (req, res, params) {
  let user = null
  let skip = params.page || 0
  skip = parseInt(skip)
  try {
    let token = await utils.extractToken(req)
    user = await utils.verifyToken(token, config.secret)
  } catch (e) {
    return send(res, 401, 'unAuthorized')
  }
  await db.connect()
  let result = await db.allTemplateEmails( user.id, skip)
  await db.disconnet()
  send(res, 200, result)
})
hash.set('PATCH /:id', async function update (req, res, params) {
  let id = params.id
  let data = await json(req)
  await db.connect()
  try {
    let token = await utils.extractToken(req)
    let user = await utils.verifyToken(token, config.secret)
    let template = await db.find('templateEmails', id)
    await utils.checkUser(user, template)
  } catch (e) {
    await db.disconnet()
    return send(res, 401, 'unAuthorized')
  }
  let result = await db.update('templateEmails', id, data)
  await db.disconnet()
  send(res, 200, result)
})
hash.set('GET /:id', async function find (req, res, params) {
  let id = params.id
  let result = null

  await db.connect()
  try {
    let token = await utils.extractToken(req)
    let user = await utils.verifyToken(token, config.secret)
    result = await db.find('templateEmails', id)
    await db.disconnet()
    await utils.checkUser(user, result)
  } catch (e) {
    return send(res, 401, 'unAuthorized')
  }
  send(res, 200, result)
})
hash.set('DELETE /:id', async function destroy (req, res, params) {
  let id = params.id
  await db.connect()
  try {
    let token = await utils.extractToken(req)
    let user = await utils.verifyToken(token, config.secret)
    let template = await db.find('templateEmails', id)
    await utils.checkUser(user, template)
  } catch (e) {
    await db.disconnet()
    return send(res, 401, 'unAuthorized')
  }
  let result = await db.destroy('templateEmails', id)
  await db.disconnet()
  send(res, 200, result)
})

export default async function main (req, res) {
  let  { method, url } = req
  let match = hash.get(`${method.toUpperCase()} ${url}`)

  if (match.handler) {
    try {
      await match.handler(req, res, match.params)
    } catch (e) {
      send(res, 500, {error: e.message})
    }
  } else {
    send(res, 404, {error: 'route not found'})
  }
}
