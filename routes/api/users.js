const express = require("express");
const { User } = require("../../model");
const { joiSchema, joiSchemaSubscription } = require("../../model/user");
const { BadRequest, Conflict, Unauthorized } = require("http-errors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { authenticate, upload } = require("../../middlewares");
const gravatar = require("gravatar");
const path = require("path");
const fs = require("fs/promises");
const Jimp = require("jimp");

const router = express.Router();

const avatarsDir = path.join(__dirname, "../../", "public", "avatars");

const { SECRET_KEY } = process.env;

router.post("/signup", async (req, res, next) => {
  try {
    const { error } = joiSchema.validate(req.body);
    if (error) {
      throw new BadRequest(error.message);
    }
    const { password, email, subscription } = req.body;
    const user = await User.findOne({ email });
    if (user) {
      throw new Conflict("Email in use");
    }
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);
    const avatarURL = gravatar.url(email);
    const newUser = await User.create({
      email,
      password: hashPassword,
      subscription,
      avatarURL,
    });
    res.status(201).json({
      user: {
        email: newUser.email,
        subscription: newUser.subscription,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { error } = joiSchema.validate(req.body);
    if (error) {
      throw new BadRequest(error.message);
    }
    const { password, email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      throw new Unauthorized("Email or password is wrong");
    }
    const passwordCompare = await bcrypt.compare(password, user.password);
    if (!passwordCompare) {
      throw new Unauthorized("Email or password is wrong");
    }
    const { _id, subscription } = user;
    const payload = {
      contactId: _id,
    };
    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "3h" });
    await User.findByIdAndUpdate(_id, { token });
    res.json({
      token,
      user: {
        email,
        subscription,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/current", authenticate, async (req, res, next) => {
  const { email, subscription } = req.user;
  res.json({
    user: {
      email,
      subscription,
    },
  });
});

router.get("/logout", authenticate, async (req, res) => {
  const { _id } = req.user;
  await User.findByIdAndUpdate(_id, { token: null });
  res.status(204).send();
});

router.patch("/", authenticate, async (req, res, next) => {
  try {
    const { error } = joiSchemaSubscription.validate(req.body);
    if (error) {
      throw new BadRequest(error.message);
    }
    const { _id, email } = req.user;
    const { subscription } = req.body;
    await User.findByIdAndUpdate(_id, { subscription });
    res.json({
      user: {
        email,
        subscription,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.patch(
  "/avatars",
  authenticate,
  upload.single("avatar"),
  async (req, res) => {
    const { path: tempUpload, filename } = req.file;
    const [extension] = filename.split(".").reverse();
    const newFileName = `${req.user._id}.${extension}`;
    const fileUpload = path.join(avatarsDir, newFileName);
    const avatarURL = path.join("avatars", newFileName);
    await Jimp.read(tempUpload)
      .then((avatar) => {
        return avatar.resize(250, 250).write(tempUpload);
      })
      .catch((error) => {
        throw error;
      });
    await fs.rename(tempUpload, fileUpload);
    await User.findByIdAndUpdate(req.user._id, { avatarURL }, { new: true });
    res.json({ avatarURL });
  }
);

module.exports = router;
