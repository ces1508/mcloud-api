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

hash.set('POST /create', async function create (req, res, params) {
  let data = await json(req)
  try {
    await db.connect()
    for (let i = 0; i < data.length; i++) {
      let newData = {
        campaingId: data[i].campaingId,
        event: data[i].event,
        email: data[i].email,
        date: data[i].timestamp
      }
      await db.createHook(newData)
    }
    await db.disconnet()
  } catch (e) {
    console.log(e.message)
    await db.disconnet()
    return send(res, 401, 'unAuthorized')
  }
})
hash.set('GET /', async function get (req, res, params) {
  try {
    let data = {campaingId:'aladsad-asdad',email:'ces15018@gmail.com', event:'dropped'}
    console.log(config)
    // await db.connect()
    // await db.createHook(data)
    // await db.disconnet()
    send(res, 200, {algo: 'asdasdasda'})
    console.log(db.host)
    console.log(db.port)
    console.log(db.db)
    await db.connect()
    await db.createHook(data)
  } catch (e) {
    console.error(e.message)
  }
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
