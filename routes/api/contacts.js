const express = require("express");
const router = express.Router();
const { joiSchema } = require("../../model/contact");
const { Contact } = require("../../model");
const { NotFound, BadRequest } = require("http-errors");
const { authenticate } = require("../../middlewares");

router.get("/", authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, favorite } = req.query;
    const { _id } = req.user;
    const skip = (page - 1) * limit;
    if (favorite === undefined) {
      const contacts = await Contact.find({ owner: _id }, "-__v", {
        skip,
        limit: +limit,
      });
      res.json(contacts);
    }
    const contacts = await Contact.find({ owner: _id, favorite }, "-__v", {
      skip,
      limit: +limit,
    });
    res.json(contacts);
  } catch (error) {
    next(error);
  }
});

router.get("/:contactId", async (req, res, next) => {
  const { contactId } = req.params;
  try {
    const contact = await Contact.findById(contactId);
    console.log(contact);
    if (!contact) {
      throw new NotFound();
    }
    res.json(contact);
  } catch (error) {
    if (error.message.includes("Cast to ObjectId failed for value")) {
      error.status = 404;
      error.message = "Not Found";
    }
    next(error);
  }
});

router.post("/", authenticate, async (req, res, next) => {
  try {
    const { error } = joiSchema.validate(req.body);
    if (error) {
      throw new BadRequest("missing required name field");
    }
    const { _id } = req.user;
    const newContact = await Contact.create({ ...req.body, owner: _id });
    res.status(201).json(newContact);
  } catch (error) {
    next(error);
  }
});

router.delete("/:contactId", async (req, res, next) => {
  try {
    const { contactId } = req.params;
    const deleteContact = await Contact.findByIdAndRemove(contactId);
    console.log(deleteContact);
    if (!deleteContact) {
      throw new NotFound();
    }
    res.json({ message: "contact deleted" });
  } catch (error) {
    if (error.message.includes("Cast to ObjectId failed for value")) {
      error.status = 404;
      error.message = "Not Found";
    }
    next(error);
  }
});

router.put("/:contactId", async (req, res, next) => {
  try {
    const { error } = joiSchema.validate(req.body);
    if (error) {
      throw new BadRequest("missing fields");
    }
    const { contactId } = req.params;
    const updateContact = await Contact.findByIdAndUpdate(contactId, req.body, {
      new: true,
    });
    if (!updateContact) {
      throw new NotFound();
    }
    res.json(updateContact);
  } catch (error) {
    if (error.message.includes("Cast to ObjectId failed for value")) {
      error.status = 404;
      error.message = "Not Found";
    }
    next(error);
  }
});

router.patch("/:contactId/favorite", async (req, res, next) => {
  try {
    const { error } = joiSchema.validate(req.body);
    if (error) {
      throw new BadRequest("wrong type");
    }
    const { contactId } = req.params;
    const { favorite } = req.body;
    if (favorite === undefined) {
      throw new BadRequest("missing field favorite");
    }
    const updateContact = await Contact.findByIdAndUpdate(
      contactId,
      { favorite },
      {
        new: true,
      }
    );
    if (!updateContact) {
      throw new NotFound();
    }
    res.json(updateContact);
  } catch (error) {
    if (error.message.includes("Cast to ObjectId failed for value")) {
      error.status = 404;
      error.message = "Not Found";
    }
    next(error);
  }
});

module.exports = router;
