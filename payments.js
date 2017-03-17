'use strict'

import httpHash from 'http-hash'
import { send, json } from 'micro'
import Db from 'mepscloud-db'
import DbStub from './test/stub/db'
import config from './config'
import utils from './lib/utils'
import uuid from 'uuid-base62'
import mail from './lib/mail'
import payments from './lib/payments'
import crypto from 'crypto'
import qs from 'querystring'
// const env = process.env.NODE_ENV || 'test'
const hash = httpHash()
let db = new Db(config.db)
const env = 'production'
if (env === 'test') {
  db = new DbStub()
}
const payuApiKey = process.env.NODE_ENV ? process.env.PAYU_API_KEY: '4Vj8eK4rloUd272L48hsrarnUA'
const payuApiLogin =process.env.NODE_ENV ? process.env.PAYU_API_LOGIN : 'pRRXKOl8ikMmt9u'
const merchantId = process.env.NODE_ENV ? process.env.PAYU_MERCHANT_ID : '508029'
const accountId = process.env.PAYU_ACCOUNT_ID || '512321'

hash.set('POST /payments', async function handlePayments (req, res, params) {
  let data = await json(req)
  let user = null
  try {
    let token = await utils.extractToken(req)
    user = await utils.verifyToken(token, config.secret)
  } catch (e) {
    console.log(e.message)
    return send(res, 401, 'unAuthorized')
  }
  if (!data.creditCardNumber) {
    return send(res, 400, {error: 'debes enviar un numero de tarjeta de credito, el nombre de la variable debe ser creditCardNumber'})
  } else {
    if ((/[^0-9-\s]+/.test(data.creditCardNumber))) return send(res, 400, {error:'la el numero de tarjeta de credito no debe contener caracteres especiales'})
    let isValid = await utils.validCreditCard(data.creditCardNumber)
    // if (!isValid) return send(res, 400, {error: 'la terjata de credito no  es valida'})
  }
  if (!data.creditCardCode) {
    return send (res, 400, {error: 'debes enviar el código de seguridad  de la tarjeta de credito, el nombre de la variable debe ser creditCardCode'})
  }
  if (!data.expirationDate) {
    return send (res, 400, {error: 'debes enviar la fecha de expiración de la tarjeta de credito, el nombre de la variable debe ser expirationDate'})
  }
  if (!data.creditCardName) {
    return send (res, 400, {error: 'debes enviar el nombre de la tarjeta de credito, el nombre de la variable debe ser creditCardName'})
  }
  if (!data.phone) {
    return send(res, 400, {error: 'debes enviar un número de celular'})
    if (data.phone.length < 10) {
      return send (res, 400, {error: 'debes enviar un numero de telefono, minimo 10 caracteres'})
    }
  }
  if (!data.city) {
    return send(res, 400, {error: 'debes enviar la ciudad'})
  }
  if (!data.amount) {
    return send(res, 400, {error: 'debes enviar la cantidad a comprar'})
  } else {
    if (data.amount < 1000) {
    return send(res, 400, {error: `la cantidad minima es 1000, solo te faltan ${1000- parseInt(data.amount)}`})
  }
  if (data.amount > 5000000) {
    return send(res, 400, {error: `lo sentimos no puedes comprar mas de 5000000 te pasaste por ${data.amount - 5000000}`})
  }
  }
  if (!data.type) {
    return send(res, 400, {error: 'debes enviar el tipo de compra que deseas relizar, variable type'})
  } else {
    if (data.type !== "SMS" && data.type !== 'EMAIL') {
      return send(res, 400, {error: 'el tipo de compra solo puede ser SMS o EMAIL '})
    }

  }
    let priceByUnit =  await utils.getPriceByPlan(data.type, data.amount)
    let price = {
      value: priceByUnit * data.amount,
      currency: "COP"
    }
    let referenceCode = uuid.v4()
    let buyer = {
      fullName: data.fullName,
      dniNumber: data.dniNumber,
      emailAddress: user.email,
      merchantBuyerId: user.id
    }
    let payer = JSON.parse(JSON.stringify(buyer))
    payer.merchantPayerId = payer.merchantBuyerId
    payer.dniType = data.dniType
    delete payer.merchantBuyerId
    let signature = `${payuApiKey}~${merchantId}~${referenceCode}~${price.value}~${price.currency}`
    let encodeSignature = crypto.createHash('md5').update(signature).digest('hex')
    let id = uuid.uuid()
    let dataPayment = {
      accountId: accountId,
      referenceCode: referenceCode,
      signature: encodeSignature,
      merchant: {
        apiKey: payuApiKey,
        apiLogin: payuApiLogin
      },
      buyer: buyer,
      payer: payer,
      price: price,
      paymentId: id,
      creditCard: {
        number: data.creditCardNumber,
        securityCode: data.creditCardCode,
        expirationDate: data.expirationDate,
        name: data.creditCardName
      }
    }
  try {
    let payment = await payments.processPaymentPayu(dataPayment)
    let  message = ""
    let error = false
    if (payment.transactionResponse.state != 'APPROVED') {
      console.log('con error')
      error = true
    }
    let savePayment = await db.create('payments', {
      email: user.email,
      orderId: payment.transactionResponse.orderId,
      transactionId: payment.transactionResponse.transactionId,
      referenceSale: referenceCode,
      state: payment.transactionResponse.state,
      price: price.value,
      amount: data.amount,
      currency: price.currency,
      type: data.type,
      numCuotas: data.numCuotas,
      description: 'nuevo pago registrado',
      message: payment.transactionResponse.responseCode,
      userId: user.id,
      trazabilityCode:payment.transactionResponse.trazabilityCode,
      authorizationCode: payment.transactionResponse.authorizationCode,
      pendingReason: payment.transactionResponse.pendingReason,
      error: error,
      errorMessage: payer.error,
      paymentNetworkResponseErrorMessage: payment.transactionResponse.paymentNetworkResponseErrorMessage,
      createdAt: Math.round(new Date().getTime() / 1000.0)
    })
    await db.createCharge(savePayment.id)
    send (res, 201, {payment})
  } catch (e) {
    console.error(e)
    return send(res, 500, {error: 'ha ocurrido un error al procesar su pago, por favor intentarlo mas tarde', type: e.message})
  }

})
hash.set('POST /notify', async function (req, res, params) {
  var body = [];
  req.on('data', function(chunk) {
    body.push(chunk)
    if (body.length > 1e6) {
      // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
      request.connection.destroy();
    }
  }).on('end', async function () {
   body =  Buffer.concat(body).toString()
   let data = qs.parse(body)
    if (data) {
      try {
        if (data.response_message_pol === "APPROVED") {
          db.paymentHook(data.reference_sale).then(data => {console.log(data)}).catch((error) => {throw new Error(error)})
        }
        return send(res, 200, {data: 'created'})
      } catch (e) {
        console.log(e.message)
        return send(res, 500, {error: 'lo sentimos hemos tenido un error'})
      }
    }
  })
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
