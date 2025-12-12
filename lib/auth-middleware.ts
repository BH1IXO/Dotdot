import { NextRequest } from 'next/server'
import { extractTokenFromHeader, verifyToken, JWTPayload } from './jwt'

export interface AuthResult {
  success: boolean
  user?: JWTPayload
  error?: string
  statusCode?: number
}

/**
 * 认证中间件
 * 从请求中提取并验证 JWT token
 * 返回认证结果
 */
export async function authenticate(req: NextRequest): Promise<AuthResult> {
  // 从请求头中提取 token
  const authHeader = req.headers.get('authorization')
  const token = extractTokenFromHeader(authHeader)

  if (!token) {
    return {
      success: false,
      error: '未提供认证信息',
      statusCode: 401,
    }
  }

  // 验证 token
  const payload = verifyToken(token)
  if (!payload) {
    return {
      success: false,
      error: '认证信息无效或已过期',
      statusCode: 401,
    }
  }

  return {
    success: true,
    user: payload,
  }
}

/**
 * 可选的认证中间件
 * 如果提供了token就验证，否则返回null
 * 用于支持可选认证的API
 */
export async function optionalAuthenticate(req: NextRequest): Promise<JWTPayload | null> {
  const authHeader = req.headers.get('authorization')
  const token = extractTokenFromHeader(authHeader)

  if (!token) {
    return null
  }

  const payload = verifyToken(token)
  return payload
}
