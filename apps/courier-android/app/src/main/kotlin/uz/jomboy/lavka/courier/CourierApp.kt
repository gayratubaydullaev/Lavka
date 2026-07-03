package uz.jomboy.lavka.courier

import android.app.Application
import uz.jomboy.lavka.core.network.ApiConfig

class CourierApp : Application() {
    override fun onCreate() {
        super.onCreate()
        ApiConfig.baseUrl = BuildConfig.API_BASE_URL
    }
}
