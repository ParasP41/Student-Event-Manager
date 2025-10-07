const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // true in production, false locally
};

export { options }