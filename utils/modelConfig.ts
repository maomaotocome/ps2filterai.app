interface ModelConfig {
    version: string;
    input: {
        [key: string]: any;
    };
}

interface ModelsConfig {
    [key: string]: ModelConfig;
}

const modelsConfig: ModelsConfig = {
    "gfpgan": {
        version: "9283608cc6b7be6b65a8e44983db012355fde4132009bf99d976b2f0896856a3",
        input: {
            img: "",
            version: "v1.4",
            scale: 2
        }
    },
    "face-to-many": {
        version: "a07f252abbbd832009640b27f063ea52d87d7a23a185ca165bec23b5adc8deaf",
        input: {
            image: "",
            prompt: "",
            style: "Video game",
            prompt_strength: 4.5,
            denoising_strength: 0.65,
            instant_id_strength: 0.8,
            negative_prompt: ""
        }
    }
};

export const getModelConfig = (modelName: string): ModelConfig | undefined => {
    return modelsConfig[modelName];
};

export const getCurrentModel = (): string => {
    return process.env.CURRENT_MODEL || "gfpgan";
};

export const getFallbackModel = (): string => {
    return "gfpgan";
};