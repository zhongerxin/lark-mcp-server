import axios from 'axios';
/**
 * 使用 refresh_token 刷新飞书的 access_token
 * @param refreshToken - 用于刷新的 refresh_token
 * @param clientId - 应用的 App ID
 * @param clientSecret - 应用的 App Secret
 * @returns 返回刷新后的 token 信息
 * @throws 如果刷新失败会抛出错误
 */
export async function refreshAccessToken(refreshToken, clientId, clientSecret) {
    try {
        const response = await axios.post('https://open.larkoffice.com/open-apis/authen/v2/oauth/token', {
            grant_type: 'refresh_token',
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken
        }, {
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            }
        });
        const data = response.data;
        console.error('data-111111111111', data);
        // 检查响应是否成功
        if (data.code !== 0) {
            throw new Error(data.error_description ||
                `Token refresh failed with code ${data.code}`);
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
    }
    catch (error) {
        // 处理网络错误或其他异常
        if (axios.isAxiosError(error)) {
            throw new Error(`Failed to refresh token: ${error.response?.data?.error_description || error.message}`);
        }
        throw error;
    }
}
