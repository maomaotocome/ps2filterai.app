import { Ratelimit } from "@upstash/ratelimit";
import type { NextApiRequest, NextApiResponse } from "next";
import requestIp from "request-ip";
import redis from "../../utils/redis";
import { getModelConfig } from "../../utils/modelConfig";

type Data = string | { error: string };
interface ExtendedNextApiRequest extends NextApiRequest {
  body: {
    imageUrl: string;
    prompt?: string;
    style?: string;
    prompt_strength?: number;
    denoising_strength?: number;
    instant_id_strength?: number;
    negative_prompt?: string;
  };
}

// Create a new ratelimiter, that allows 3 requests per day
const ratelimit = redis
  ? new Ratelimit({
    redis: redis,
    limiter: Ratelimit.fixedWindow(3, "1440 m"),
    analytics: true,
  })
  : undefined;

// Set a longer timeout for the API route (60 seconds, which is the maximum for Vercel serverless functions)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: false,
  },
};

export default async function handler(
  req: ExtendedNextApiRequest,
  res: NextApiResponse<Data>
) {
  console.log("API handler started");

  // Check if REPLICATE_API_KEY is set
  if (!process.env.REPLICATE_API_KEY) {
    console.error("REPLICATE_API_KEY is not set in the environment variables");
    res.status(500).json({ error: "Server configuration error: API key is missing" });
    return;
  }

  // Rate Limiter Code
  if (ratelimit) {
    const identifier = requestIp.getClientIp(req);
    const result = await ratelimit.limit(identifier!);
    res.setHeader("X-RateLimit-Limit", result.limit);
    res.setHeader("X-RateLimit-Remaining", result.remaining);

    if (!result.success) {
      res.status(429).json({ error: "Too many uploads in 1 day. Please try again after 24 hours." });
      return;
    }
  }

  const imageUrl = req.body.imageUrl;
  let prompt = req.body.prompt;
  const style = req.body.style || "Video game";
  const prompt_strength = req.body.prompt_strength;
  const denoising_strength = req.body.denoising_strength;
  const instant_id_strength = req.body.instant_id_strength;
  let negative_prompt = req.body.negative_prompt;

  const model = "face-to-many";
  console.log(`Processing with model: ${model}`);

  try {
    const modelConfig = getModelConfig(model);

    if (!modelConfig) {
      throw new Error(`Invalid model configuration for model: ${model}`);
    }

    console.log(`Model configuration: ${JSON.stringify(modelConfig)}`);

    // Prepare input for the face-to-many model
    const modelInput = { ...modelConfig.input };
    modelInput.image = imageUrl;
    modelInput.style = style;

    // Enhanced PS2-era prompt
    prompt = `${prompt || ""} PS2 era video game character, low-poly 3D model, 480p resolution, early 2000s video game graphics, jagged edges, limited texture detail, flat shading`;

    // Enhanced negative prompt for PS2-era style
    negative_prompt = `${negative_prompt || ""} high resolution, smooth textures, modern graphics, ray tracing, 4K, HDR, photorealistic, detailed textures`;

    if (prompt) modelInput.prompt = prompt;
    if (prompt_strength !== undefined) modelInput.prompt_strength = prompt_strength;
    if (denoising_strength !== undefined) modelInput.denoising_strength = denoising_strength;
    if (instant_id_strength !== undefined) modelInput.instant_id_strength = instant_id_strength;
    if (negative_prompt) modelInput.negative_prompt = negative_prompt;

    console.log("Request payload:", JSON.stringify({
      version: modelConfig.version,
      input: modelInput,
    }));

    // POST request to Replicate to start the image generation process
    let startResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Token " + process.env.REPLICATE_API_KEY,
      },
      body: JSON.stringify({
        version: modelConfig.version,
        input: modelInput,
      }),
    });

    console.log("API Response Status:", startResponse.status);

    let jsonStartResponse = await startResponse.json();
    console.log("API Response Body:", JSON.stringify(jsonStartResponse));

    if (!startResponse.ok) {
      if (startResponse.status === 401) {
        console.error("Authentication failed. Please check your REPLICATE_API_KEY.");
        throw new Error("Authentication failed. Please check your API key.");
      }
      throw new Error(`API request failed for model ${model} (version ${modelConfig.version}) with status ${startResponse.status}: ${JSON.stringify(jsonStartResponse)}`);
    }

    if (!jsonStartResponse.urls || !jsonStartResponse.urls.get) {
      throw new Error(`Invalid response from Replicate API for model ${model} (version ${modelConfig.version}): ${JSON.stringify(jsonStartResponse)}`);
    }

    let endpointUrl = jsonStartResponse.urls.get;

    // GET request to get the status of the image generation process & return the result when it's ready
    let generatedImage: string | null = null;
    let retries = 0;
    const maxRetries = 12; // 60 seconds with 5-second intervals
    while (!generatedImage && retries < maxRetries) {
      console.log(`Polling for result... (Attempt ${retries + 1}/${maxRetries})`);
      let finalResponse = await fetch(endpointUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Token " + process.env.REPLICATE_API_KEY,
        },
      });
      let jsonFinalResponse = await finalResponse.json();
      console.log("Polling response:", JSON.stringify(jsonFinalResponse));

      if (jsonFinalResponse.status === "succeeded") {
        generatedImage = jsonFinalResponse.output;
        console.log("Image generation succeeded");
      } else if (jsonFinalResponse.status === "failed") {
        const errorMessage = jsonFinalResponse.error || "Unknown error occurred";
        console.error(`Image generation failed: ${errorMessage}`);
        if (errorMessage.includes("No face detected")) {
          throw new Error("No face detected in the uploaded image. Please try a different image with a clear face.");
        } else {
          throw new Error(`Image generation failed for model ${model} (version ${modelConfig.version}): ${errorMessage}`);
        }
      } else if (jsonFinalResponse.status === "processing") {
        console.log("Image is still processing...");
        retries++;
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds before next poll
      } else {
        console.warn(`Unexpected status: ${jsonFinalResponse.status}`);
        retries++;
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds before next poll
      }
    }

    if (!generatedImage) {
      console.error(`Image generation timed out after ${maxRetries} attempts`);
      res.status(202).json({ error: "Image generation is taking longer than expected. Please check back later." });
      return;
    }

    console.log("Sending successful response");
    res.status(200).json(generatedImage);
  } catch (error) {
    console.error("Error in image generation:", error);
    res.status(500).json({ error: "Failed to generate image: " + (error as Error).message });
  }
}
