import axios from 'axios';

interface TokenRefreshResponse {
  code: number;
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

/**
 * Refresh Lark access_token using refresh_token
 * @param refreshToken - The refresh_token used for refreshing
 * @param clientId - Application's App ID
 * @param clientSecret - Application's App Secret
 * @returns Returns refreshed token information
 * @throws Throws an error if refresh fails
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<TokenRefreshResponse> {
  try {
    const response = await axios.post<TokenRefreshResponse>(
      'https://open.larkoffice.com/open-apis/authen/v2/oauth/token',
      {
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken
      },
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        }
      }
    );

    const data = response.data;

    console.error('data-111111111111', data);

    // 检查响应是否成功
    if (data.code !== 0) {
      throw new Error(
        data.error_description || 
        `Token refresh failed with code ${data.code}`
      );
    }

    return {
      code: data.code,
      access_token: data.access_token,
      expires_in: data.expires_in,
      refresh_token: data.refresh_token,
      refresh_token_expires_in: data.refresh_token_expires_in,
      token_type: data.token_type,
      scope: data.scope
    };
  } catch (error) {
    // 处理网络错误或其他异常
    if (axios.isAxiosError(error)) {
      throw new Error(
        `Failed to refresh token: ${error.response?.data?.error_description || error.message}`
      );
    }
    throw error;
  }
}
