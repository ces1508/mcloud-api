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

hash.set('POST /create', async function createSms (req, res, params) {
  let data = await json(req)
  try {
    let token = await utils.extractToken(req)
    let user = await utils.verifyToken(token, config.secret)
    data.userId = user.id
  } catch (e) {
    return send(res, 401, e.message)
  }
  await db.connect()
  let result = await db.create('campaingSms', data)
  await db.disconnet()
  send(res, 201, result)
})

hash.set('GET /page/:page', async function allSms (req, res, params) {
  let user = null
  let skip = params.page || 0
  console.log(skip)
  skip = parseInt(skip)
  try {
    let token = await utils.extractToken(req)
    user = await utils.verifyToken(token, config.secret)
  } catch (e) {
    return send(res, 401, 'unAuthorized')
  }
  await db.connect()
  try {
    let result = await db.allCampaing('campaingSms', user.id, skip)
    await db.disconnet()
    send(res, 200, result)
  } catch (e) {
    console.error(e)
    return send(res,500, e)
  }
})
hash.set('PATCH /:id', async function updateSms (req, res, params) {
  let user = null
  let id = params.id
  let data = await json(req)
  try {
    let token = await utils.extractToken(req)
    user = await utils.verifyToken(token, config.secret)
    let campaing = db.find('campaingSms', id)
    await utils.checkUser(user, data)
  } catch (e) {
    return send(res, 401, 'unAuthorized')
  }
  await db.connect()
  let campaing = await db.update('campaingSms', id, data)
  send(res, 200, campaing)
})

hash.set('GET /:id/page/:page', async function findSms (req, res, params) {
  let id = params.id
  console.log(id)
  let campaing = null
  let skip = params.page || 0
  console.log(skip)
  try {
    await db.connect()
    let token = await utils.extractToken(req)
    console.log(token)
    let user = await utils.verifyToken(token, config.secret)
    console.log(user)
    let result = await db.find('campaingSms', id)
    console.log(result)
    await utils.checkUser(user, result)
  } catch (e) {
    console.log(e.message)
     await db.disconnet()
    return send(res, 401, 'unAuthorized')
  }
  campaing = await db.all('historySms', 'campaingId', id, skip)
  await db.disconnet()
  send(res, 200, result)
})
hash.set('DELETE /:id', async function destroySms (req, res, params) {
  let id = params.id
  await db.connect()
  try {
    let token = await utils.extractToken(req)
    let user = await utils.verifyToken(token, config.secret)
    let campaing = await db.find('campaingSms', id)
    await utils.checkUser(user, campaing)
  } catch (e) {
    await db.disconnet()
    return send(res, 401, 'unAuthorized')
  }
  let result = await db.destroy('campaingSms', id)
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
