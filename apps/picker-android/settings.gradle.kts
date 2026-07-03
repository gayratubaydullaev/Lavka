pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "picker-android"
include(":app")
include(":core:network")
include(":core:database")
include(":core:sync")

project(":core:network").projectDir = file("../../packages/android-core/network")
project(":core:database").projectDir = file("../../packages/android-core/database")
project(":core:sync").projectDir = file("../../packages/android-core/sync")
