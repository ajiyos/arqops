package com.arqops.common.tenancy;

/**
 * Holds request-derived metadata for {@code @Async} tasks where {@link org.springframework.web.context.request.RequestContextHolder}
 * is not available on the worker thread.
 */
public final class AsyncAuditContext {

    private static final ThreadLocal<String> CLIENT_IP = new ThreadLocal<>();

    private AsyncAuditContext() {}

    public static void setClientIp(String ip) {
        CLIENT_IP.set(ip);
    }

    public static String getClientIp() {
        return CLIENT_IP.get();
    }

    public static void clear() {
        CLIENT_IP.remove();
    }
}
