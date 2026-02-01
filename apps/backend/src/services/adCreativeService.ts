import axios from 'axios';

type AdCreativeRequest = {
  copy: string;
  format: string;
  brand?: string;
  colors?: string[];
  style?: string;
};

type AdCreativeResponse = {
  success: boolean;
  image_url?: string;
  error?: string;
};

const AD_CREATIVE_API_URL = process.env.AD_CREATIVE_API_URL || 'https://api.adcreative.ai/v1';
const AD_CREATIVE_API_KEY = process.env.AD_CREATIVE_API_KEY;

export async function generateAdCreative(params: AdCreativeRequest): Promise<AdCreativeResponse> {
  if (!AD_CREATIVE_API_KEY) {
    return {
      success: false,
      error: 'AD_CREATIVE_API_KEY não configurada',
    };
  }

  try {
    const response = await axios.post(
      `${AD_CREATIVE_API_URL}/generate`,
      {
        text: params.copy,
        format: params.format,
        brand_name: params.brand,
        brand_colors: params.colors,
        style: params.style || 'modern',
      },
      {
        headers: {
          'Authorization': `Bearer ${AD_CREATIVE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    if (response.data?.image_url) {
      return {
        success: true,
        image_url: response.data.image_url,
      };
    }

    return {
      success: false,
      error: 'Resposta inválida da API Ad Creative',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.response?.data?.message || error?.message || 'Erro ao gerar criativo',
    };
  }
}
