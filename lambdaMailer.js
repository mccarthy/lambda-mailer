const aws = require('aws-sdk')
const ses = new aws.SES()
const getParamsFromUrl = require('./getParamsFromUrl')

module.exports = (options) => {
  const { myEmail, myDomain } = options

  function generateResponse (code, payload) {
    return {
      statusCode: code,
      headers: {
        'Access-Control-Allow-Origin': myDomain,
        'Access-Control-Allow-Headers': 'x-requested-with',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify(payload)
    }
  }
  function generateError (code, err) {
    console.log(err)
    return {
      statusCode: code,
      headers: {
        'Access-Control-Allow-Origin': myDomain,
        'Access-Control-Allow-Headers': 'x-requested-with',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify(err.message)
    }
  }
  function generateRedirect (code, redirectUrl) {
    return {
      statusCode: code,
      headers: {
        'Access-Control-Allow-Origin': myDomain,
        'Access-Control-Allow-Headers': 'x-requested-with',
        'Access-Control-Allow-Credentials': true,
        'Location': redirectUrl
      }
    }
  }
  function generateEmailParamsFromJSON (body) {
    const { email, name, content } = JSON.parse(body)
    if (!(email && name)) {
      throw new Error('Email and Name are required')
    }

    return {
      Source: myEmail,
      Destination: { ToAddresses: [myEmail] },
      ReplyToAddresses: [email],
      Message: {
        Body: {
          Text: {
            Charset: 'UTF-8',
            Data: `RSVP:\n \
                   Email: ${email}\n \
                   Name: ${name} \n \
                   Attending: ${attend} \n \
                   Meal: ${meal} \n \
                   Message: ${message} \
                   \n \
                   ${email}|${name}|${attend}|${meal}|${message}`
          }
        },
        Subject: {
          Charset: 'UTF-8',
          Data: `Wedding RSVP from danmanda.party ${name}`
        }
      }
    }
  }
  function generateEmailParamsFromUriEncoded (body) {
    const { email, name, message, attend, meal } = getParamsFromUrl(body)
    if (!(email && name)) {
      throw new Error('Email and Name are required')
    }

    const replacedName = name.replace(/\+/g, ' ')
    const replacedMessage = message.replace(/\+/g, ' ')
    return {
      Source: myEmail,
      Destination: { ToAddresses: [myEmail] },
      ReplyToAddresses: [email],
      Message: {
        Body: {
          Text: {
            Charset: 'UTF-8',
            Data: `RSVP:\n \
                   Email: ${email}\n \
                   Name: ${replacedName} \n \
                   Attending: ${attend} \n \
                   Meal: ${meal} \n \
                   Message: ${replacedMessage} \n \
                   \n \
                   ${email}|${replacedName}|${attend}|${meal}|${replacedMessage}`
          }
        },
        Subject: {
          Charset: 'UTF-8',
          Data: `Wedding RSVP from danmanda.party: ${replacedName}`
        }
      }
    }
  }

  async function sendJSON (event) {
    try {
      const emailParams = generateEmailParamsFromJSON(event.body)
      const data = await ses.sendEmail(emailParams).promise()
      return generateResponse(200, data)
    } catch (err) {
      return generateError(500, err)
    }
  }
  async function sendFormEncoded (event) {
    try {
      const redirectUrl = event.queryStringParameters ? event.queryStringParameters.redirectUrl : event.headers.Referer
      const emailParams = generateEmailParamsFromUriEncoded(event.body)
      await ses.sendEmail(emailParams).promise()
      return generateRedirect(302, redirectUrl)
    } catch (err) {
      return generateError(500, err)
    }
  }

  return {
    sendJSON,
    sendFormEncoded
  }
}
