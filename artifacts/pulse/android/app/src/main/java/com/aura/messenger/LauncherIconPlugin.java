package com.aura.messenger;

import android.content.ComponentName;
import android.content.pm.PackageManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.LinkedHashMap;
import java.util.Map;

@CapacitorPlugin(name = "LauncherIcon")
public class LauncherIconPlugin extends Plugin {
    private static final Map<String, String> ICON_ALIASES = new LinkedHashMap<String, String>() {{
        put("orange", "IconOrange");
        put("violet", "IconViolet");
        put("blue", "IconBlue");
        put("green", "IconGreen");
        put("pink", "IconPink");
        put("gta6", "IconGta6");
    }};

    @PluginMethod
    public void setIcon(PluginCall call) {
        String name = call.getString("name");
        if (name == null || !ICON_ALIASES.containsKey(name)) {
            call.reject("Неизвестная иконка приложения");
            return;
        }

        PackageManager packageManager = getContext().getPackageManager();
        String packageName = getContext().getPackageName();
        try {
            for (Map.Entry<String, String> entry : ICON_ALIASES.entrySet()) {
                ComponentName alias = new ComponentName(packageName, packageName + "." + entry.getValue());
                int state = entry.getKey().equals(name)
                    ? PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                    : PackageManager.COMPONENT_ENABLED_STATE_DISABLED;
                packageManager.setComponentEnabledSetting(alias, state, PackageManager.DONT_KILL_APP);
            }

            JSObject result = new JSObject();
            result.put("name", name);
            call.resolve(result);
        } catch (RuntimeException error) {
            call.reject("Не удалось изменить иконку приложения");
        }
    }
}
