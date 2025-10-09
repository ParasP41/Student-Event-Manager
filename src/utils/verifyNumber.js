import axios from "axios";
import { ApiError } from "../utils/APIError.js";

const verifyNumber = async (phoneNumber) => {
    if (!phoneNumber) {
        throw new ApiError(400, "Phone number is required");
    }

    try {
        const response = await axios.get(
            `https://apilayer.net/api/validate`,
            {
                params: {
                    access_key: process.env.NUMVERIFY_API_KEY,
                    number: `+91${phoneNumber}`
                }
            }
        );

        const data = response.data;

        if (!data.valid || data.line_type !== "mobile") {
            throw new ApiError(400, "Enter a valid mobile number");
        }

        return true; // optionally return true if valid
    } catch (err) {
        // Axios/network error handling
        throw new ApiError(500, "Failed to validate phone number");
    }
};

export { verifyNumber };
