import sgMail from '@sendgrid/mail'
import { logger } from './logger.js'
import { env } from './env_handler.js'

function send_email(subject: string, text: string)
{
    text += `\nSent at ${new Date().toString()}`
    const on_email_sent = () => logger.info('Email of subject %s sent', subject)
    const msg = {
        to: env.EMAIL_TARGET,
        from: env.EMAIL,
        subject: subject,
        text: text,
        html: text
    }
    sgMail.send(msg).then(on_email_sent).catch(logger.error.bind(logger))
}

async function email_setup() 
{
    logger.info(`Setting sendgrid api key to ${env.SENDGRID_API_KEY}`)
    sgMail.setApiKey(env.SENDGRID_API_KEY)
    return true
}

export { send_email, email_setup }