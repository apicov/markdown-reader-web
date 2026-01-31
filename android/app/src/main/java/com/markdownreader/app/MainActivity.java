package com.markdownreader.app;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        Log.d(TAG, "Registering DocumentProviderPlugin BEFORE super.onCreate()...");
        // Register custom plugins BEFORE calling super.onCreate()
        registerPlugin(DocumentProviderPlugin.class);
        Log.d(TAG, "DocumentProviderPlugin registered");

        super.onCreate(savedInstanceState);
        Log.d(TAG, "MainActivity onCreate complete");
    }
}
