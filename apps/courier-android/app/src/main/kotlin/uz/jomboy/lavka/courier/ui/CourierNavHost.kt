package uz.jomboy.lavka.courier.ui

import androidx.compose.runtime.*
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import uz.jomboy.lavka.courier.ui.screens.*
import uz.jomboy.lavka.courier.viewmodel.CourierViewModel

@Composable
fun CourierNavHost(vm: CourierViewModel) {
    val nav = rememberNavController()

    NavHost(nav, startDestination = if (vm.isAuthenticated) "shift" else "auth") {
        composable("auth") {
            AuthScreen(onAuth = { vm.isAuthenticated = true; nav.navigate("shift") { popUpTo("auth") { inclusive = true } } })
        }
        composable("shift") {
            ShiftScreen(
                vm = vm,
                onOnline = { nav.navigate("home") },
                onStats = { nav.navigate("stats") },
            )
        }
        composable("home") {
            HomeScreen(
                vm = vm,
                onDelivery = { nav.navigate("delivery/${it}") },
                onActive = { nav.navigate("active") },
                onHeatmap = { nav.navigate("heatmap") },
            )
        }
        composable("active") {
            ActiveOrdersScreen(vm = vm, onDelivery = { nav.navigate("delivery/$it") }, onBack = { nav.popBackStack() })
        }
        composable("delivery/{orderId}") { entry ->
            DeliveryScreen(
                orderId = entry.arguments?.getString("orderId") ?: "",
                vm = vm,
                onDone = { nav.navigate("home") { popUpTo("home") { inclusive = true } } },
            )
        }
        composable("stats") {
            StatsScreen(vm = vm, onBack = { nav.popBackStack() })
        }
        composable("heatmap") {
            HeatmapScreen(vm = vm, onBack = { nav.popBackStack() })
        }
    }
}
