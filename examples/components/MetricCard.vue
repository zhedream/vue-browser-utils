<template
  ><div class="metric-card"
    ><span class="metric-label">{{ label }}</span
    ><strong
      >{{ value }}<small>{{ unit }}</small></strong
    ><span class="metric-note">{{ note }}</span></div
  ></template
>
<script>
export default { props: ["label", "value", "unit", "note"] };
</script>
