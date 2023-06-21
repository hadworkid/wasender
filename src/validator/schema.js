const Joi = require("joi")

const MessageTextContentSchema = Joi.object({
    text: Joi.string().required(),
});

const MessageImageContentSchema = Joi.object({
    image: Joi.object({
        url: Joi.string().required(),
    }).required(),
    fileName: Joi.string().optional().allow(null),
    caption: Joi.string().optional().allow(null),
});

module.exports = {
    MessageTextContentSchema,
    MessageImageContentSchema,
}