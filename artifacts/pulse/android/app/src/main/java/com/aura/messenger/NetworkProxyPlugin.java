package com.aura.messenger;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;

import androidx.webkit.ProxyConfig;
import androidx.webkit.ProxyController;
import androidx.webkit.WebViewFeature;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executor;
import java.util.concurrent.TimeUnit;
import java.util.Locale;

@CapacitorPlugin(name = "NetworkProxy")
public class NetworkProxyPlugin extends Plugin {
    private static final String PREFERENCES = "nova_network_proxy";
    private static final String KEY_ENABLED = "enabled";
    private static final String KEY_TYPE = "type";
    private static final String KEY_HOST = "host";
    private static final String KEY_PORT = "port";
    private static final Executor DIRECT_EXECUTOR = Runnable::run;
    private static final Executor MAIN_EXECUTOR =
        command -> new Handler(Looper.getMainLooper()).post(command);

    static void applySavedProxy(Context context) {
        SharedPreferences preferences = preferences(context);
        if (!preferences.getBoolean(KEY_ENABLED, false)) return;

        try {
            if (!WebViewFeature.isFeatureSupported(WebViewFeature.PROXY_OVERRIDE)) {
                preferences.edit().putBoolean(KEY_ENABLED, false).apply();
                return;
            }

            ProxyConfig config = buildConfig(
                preferences.getString(KEY_TYPE, ""),
                preferences.getString(KEY_HOST, ""),
                preferences.getInt(KEY_PORT, 0)
            );
            CountDownLatch applied = new CountDownLatch(1);
            ProxyController.getInstance().setProxyOverride(config, DIRECT_EXECUTOR, applied::countDown);
            // Configure the proxy before BridgeActivity starts loading its remote page.
            applied.await(2, TimeUnit.SECONDS);
        } catch (Exception ignored) {
            // Fail open: a malformed or unsupported saved proxy must not prevent app startup.
            preferences.edit().putBoolean(KEY_ENABLED, false).apply();
        }
    }

    @PluginMethod
    public void getSettings(PluginCall call) {
        SharedPreferences preferences = preferences(getContext());
        JSObject result = new JSObject();
        result.put("supported", WebViewFeature.isFeatureSupported(WebViewFeature.PROXY_OVERRIDE));
        result.put("enabled", preferences.getBoolean(KEY_ENABLED, false));
        result.put("type", preferences.getString(KEY_TYPE, "socks5"));
        result.put("host", preferences.getString(KEY_HOST, ""));
        result.put("port", preferences.getInt(KEY_PORT, 0));
        call.resolve(result);
    }

    @PluginMethod
    public void setProxy(PluginCall call) {
        String type = call.getString("type");
        String host = call.getString("host");
        Integer port = call.getInt("port");

        if (!WebViewFeature.isFeatureSupported(WebViewFeature.PROXY_OVERRIDE)) {
            call.reject("Эта версия Android System WebView не поддерживает прокси");
            return;
        }
        if (type == null || host == null || port == null) {
            call.reject("Укажите тип, сервер и порт прокси");
            return;
        }

        final ProxyConfig config;
        try {
            config = buildConfig(type, host, port);
        } catch (IllegalArgumentException error) {
            call.reject(error.getMessage());
            return;
        }

        try {
            ProxyController.getInstance().setProxyOverride(config, MAIN_EXECUTOR, () -> {
                preferences(getContext()).edit()
                    .putBoolean(KEY_ENABLED, true)
                    .putString(KEY_TYPE, type)
                    .putString(KEY_HOST, host.trim())
                    .putInt(KEY_PORT, port)
                    .apply();
                JSObject result = new JSObject();
                result.put("enabled", true);
                call.resolve(result);
            });
        } catch (RuntimeException error) {
            call.reject("Не удалось применить прокси");
        }
    }

    @PluginMethod
    public void clearProxy(PluginCall call) {
        SharedPreferences preferences = preferences(getContext());
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.PROXY_OVERRIDE)) {
            preferences.edit().clear().apply();
            call.resolve(new JSObject().put("enabled", false));
            return;
        }

        try {
            ProxyController.getInstance().clearProxyOverride(MAIN_EXECUTOR, () -> {
                preferences.edit().clear().apply();
                call.resolve(new JSObject().put("enabled", false));
            });
        } catch (RuntimeException error) {
            call.reject("Не удалось отключить прокси");
        }
    }

    private static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
    }

    private static ProxyConfig buildConfig(String type, String host, int port) {
        String normalizedType = type == null ? "" : type.trim().toLowerCase(Locale.ROOT);
        String normalizedHost = host == null ? "" : host.trim();
        boolean validDomain = normalizedHost.matches(
            "(?i)(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*"
        );
        boolean validIpv6 = normalizedHost.matches("\\[[0-9a-fA-F:.%]+\\]");

        if (!"http".equals(normalizedType) && !"socks5".equals(normalizedType)) {
            throw new IllegalArgumentException("Поддерживаются только HTTP и SOCKS5");
        }
        if (!validDomain && !validIpv6) {
            throw new IllegalArgumentException("Введите сервер без схемы, пути и данных для входа");
        }
        if (port < 1 || port > 65535) {
            throw new IllegalArgumentException("Порт должен быть от 1 до 65535");
        }

        String proxyScheme = "socks5".equals(normalizedType) ? "SOCKS" : "HTTP";
        return new ProxyConfig.Builder()
            .addProxyRule(normalizedHost + ":" + port, proxyScheme)
            .build();
    }
}
