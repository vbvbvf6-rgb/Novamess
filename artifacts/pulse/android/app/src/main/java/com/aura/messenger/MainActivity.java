package com.aura.messenger;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        NetworkProxyPlugin.applySavedProxy(getApplicationContext());
        registerPlugin(NetworkProxyPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
