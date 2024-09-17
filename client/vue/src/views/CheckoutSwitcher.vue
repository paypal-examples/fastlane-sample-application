<script setup>
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import CheckoutView from './CheckoutView.vue';
import CheckoutFlexibleView from './CheckoutFlexibleView.vue';

const route = useRoute();

const currentComponent = computed(() => {
    return route.query.flexible === 'true' ? CheckoutFlexibleView : CheckoutView;
});
</script>

<template>
    <component :is="currentComponent"></component>
</template>