package uz.jomboy.lavka.picker.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import uz.jomboy.lavka.picker.ui.screens.AssemblyScreen
import uz.jomboy.lavka.picker.ui.screens.AuthScreen
import uz.jomboy.lavka.picker.ui.screens.PackScreen
import uz.jomboy.lavka.picker.ui.screens.QueueScreen
import uz.jomboy.lavka.picker.ui.screens.StatsScreen
import uz.jomboy.lavka.picker.viewmodel.PickerViewModel

@Composable
fun PickerNavHost() {
    val nav = rememberNavController()
    val vm: PickerViewModel = viewModel()

    NavHost(navController = nav, startDestination = if (vm.isAuthenticated) "queue" else "auth") {
        composable("auth") {
            AuthScreen(onAuthenticated = {
                vm.isAuthenticated = true
                nav.navigate("queue") { popUpTo("auth") { inclusive = true } }
            })
        }
        composable("queue") {
            QueueScreen(
                vm = vm,
                onStartTask = { nav.navigate("assembly") },
                onStats = { nav.navigate("stats") },
            )
        }
        composable("assembly") {
            AssemblyScreen(
                vm = vm,
                onComplete = { nav.navigate("pack") },
                onBack = { nav.popBackStack() },
            )
        }
        composable("pack") {
            PackScreen(
                vm = vm,
                onDone = {
                    nav.navigate("queue") { popUpTo("queue") { inclusive = true } }
                },
            )
        }
        composable("stats") {
            StatsScreen(vm = vm, onBack = { nav.popBackStack() })
        }
    }
}
