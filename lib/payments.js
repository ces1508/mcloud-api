import rp from 'request-promise'
class Payments {
  async  processPaymentPayu (data) {
    let dataPayu = {
      language: "es", //requerido
      command: "SUBMIT_TRANSACTION", //requerido
      merchant: data.merchant,
      transaction: {
        order: {
          accountId: data.accountId,
          referenceCode: data.referenceCode,
          description: "prueba desde mepscloud",
          language: "es",
          notifyUrl: "https://2c1bc19b.ngrok.io/notify",
          signature: data.signature,
          buyer: data.buyer,
          additionalValues: {
              "TX_VALUE": data.price
          }
        },
        creditCard: data.creditCard,
        paymentMethod: "VISA",
        type: "AUTHORIZATION_AND_CAPTURE",
        paymentCountry: "CO",
        ipAddress: "127.0.0.1",
        payer: data.payer,
        extraParameters: {
          INSTALLMENTS_NUMBER: data.numCuotas,
          paymentId: data.paymentId
        }
      },
      test: false
    }
    let options = {
      method: 'POST',
      uri: 'https://sandbox.api.payulatam.com/payments-api/4.0/service.cgi',
      json: true,
      body: dataPayu,
      timeout: 5000
    }
    try {
      let response = await rp(options)
      if (response.error) {
        return Promise.reject(response.error)
      }
      return Promise.resolve(response)
    } catch (e) {
      return Promise.reject(e.message)
    }

  }
}
export default new Payments()