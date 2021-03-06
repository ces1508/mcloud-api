'use strict'
import httpHash from 'http-hash'
import { send, json } from 'micro'
import Db from 'mepscloud-db'
import DbStub from './test/stub/db'
import config from './config'
import utils from './lib/utils'
// const env = process.env.NODE_ENV || 'test'
const hash = httpHash()
let db = new Db(config.db)
const env = 'production'
if (env === 'test') {
  db = new DbStub()
}

hash.set('POST /report-index', async function reportIndex (req, res , params) {
  let data = await json(req)
  try {
    let token = await utils.extractToken(req)
    let user = await utils.verifyToken(token, config.secret)
    let dataSms = []
    let dataEmail = []
    if (data.type === 'week') {
      let initialDate = Math.round(new Date().getTime()/ 1000.0)
      let lastDate = new Date()
      lastDate.setDate(lastDate.getDate() -7)
      lastDate = Math.round(new Date(lastDate).getTime() / 1000.0)
      console.log(initialDate, lastDate)
      dataEmail = await db.getReportEmailbyDate(user.id, initialDate, lastDate)
    }

    if (data.type === 'month') {
      // let initialDate = Math.round(new Date().getTime()/ 1000.0)
      // let lastDate = new Date()
      // lastDate.setDate(lastDate.getDate() -28)
      // lastDate = Math.round(new Date(lastDate).getTime() / 1000.0)
      // dateEmai = yield getReportEmailbyDate(user.id, initialDate, lastDate)
    }
    send(res, 200, {email: dataEmail, sms: dataSms})
  }
  catch (e) {
    console.error(e.message)
    return send(res, 500,)
  }
})

hash.set('POST /report-sms', async function reportDateSms (req, res) {
  let data = await json(req)
  let user = null

  if (data.initialDate && data.lastDate) {
    try {
      let token = await utils.extractToken(req)
      user = await utils.verifyToken(token, config.secret)
    } catch (e) {
      console.error(e.message)
      return send(res, 401, 'unAuthorized')
    }
    let report = await db.getReportSmsbyDate(user.id, data.initialDate, data.lastDate)
    let response = utils.parseReport(report)
    response = utils.sort(response)
    send(res, 200,  response)
  } else {
    send(res, 400, {error: 'debes enviar los parametros initialDate y lastDate'})
  }
 })

hash.set('POST /:id/sms', async function find (req, res, params) {
  let id = params.id
  try {
    let token = await utils.extractToken(req)
    let user = await utils.verifyToken(token, config.secret)
    let campaing = await db.find('campaingSms', id)
    await utils.checkUser(user, campaing)
  }
  catch (e) {
    console.error(e.message)
    return send(res, 401, 'unAuthorized')
  }
  try {
    let data = await db.createReport(id,'sms')
    send(res, 200, data)
  } catch (e) {
    console.error(e.message)
    return send(res, 500, {error: e.message})
  }
})


hash.set('GET /:id/email', async function reportByCampaignEmail (req, res, params) {
  let id = params.id
  let response = [{event: 'click', value : 0}, {event: 'open', value: 0}, {event: 'bounce', value: 0},
    {event: 'deferred', value : 0}, {event: 'delivered', value: 0}, {event: 'dropped', value: 0}, {event: 'processed', value: 0},
    {event: 'sending', value : 0}, {event: 'spamreport', value: 0}, {event: 'unsubscribe', value: 0}]
  try {
    let token = await utils.extractToken(req)
    let user = await utils.verifyToken(token, config.secret)
    let campaing = await db.find('campaingEmails', id)
    await utils.checkUser(user, campaing)
  }
  catch (e) {
    console.error(e.message)
    return send(res, 401, 'unAuthorized')
  }
  try {
    let data = await db.graphEmailsbyCampaign(id)
    for (let i = 0; i < response.length; i++) {
      for (let j = 0; j < data.length; j++) {
        if (response[i].event === data[j].group) {
          response[i].value = data[j].reduction
        }
      }
    }
    send(res, 200, response)
  } catch (e) {
    return send(res, 500, {error: e.message})
  }
})

hash.set('POST /reportEmail-by-month', async function reportEmailMonth (req, res, params) {
  let data = await json(req)
  if (data.initialDate && data.lastDate) {

    let user = null
    try {
      await db.connect()
      let token = await utils.extractToken(req)
      user = await utils.verifyToken(token, config.secret)
    }
    catch (e) {
      return send(res, 401, 'unAuthorized')
    }
    try  {
      let report = await db.getReportEmailbyDate(user.id , data.initialDate, data.lastDate)
      let response = utils.parseReport(report)
      let order = utils.sort(response)
      send(res, 200, order)
    } catch (e) {
      console.log(e.message)
      return send(res, 500, {error: 'lo sentimos ocurrió un error, por favor intentalo mas tarde'})
    }
  } else {
    return send(res, 400, {error: 'debes enviar los parametros initDay ay lastDate en formato Epoch'})
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
