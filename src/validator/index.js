const { MessageTextContentSchema, MessageImageContentSchema } = require("./schema");

const Validator = {
    validationMessageTextContent: (content) => {
        const validationResult = MessageTextContentSchema.validate(content);
        if (validationResult.error) {
          throw new Error(validationResult.error.message);
        }
    },
    validateMessageImageContent: (content) => {
        const validationResult = MessageImageContentSchema.validate(content);
        if (validationResult.error) {
          throw new Error(validationResult.error.message);
        }
    },
};

module.exports = Validator;