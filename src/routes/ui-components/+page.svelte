<script>
  import { AppSuffix } from '$lib/components/ui';
  
  // Example branding schemes
  const brands = [
    { 
      name: 'TalkType', 
      color: 'inherit', 
      size: '65%'
    },
    { 
      name: 'SnipSite', 
      color: '#4338ca', 
      size: '65%'
    },
    { 
      name: 'WordFlow', 
      color: '#0891b2', 
      size: '65%'
    },
    { 
      name: 'CodeScribe', 
      color: '#059669', 
      size: '65%'
    }
  ];
</script>

<div class="p-8 max-w-3xl mx-auto">
  <h1 class="text-3xl font-bold mb-8">UI Component: .app Suffix</h1>
  
  <section class="mb-10">
    <h2 class="text-xl font-semibold mb-4">Basic Usage</h2>
    <div class="p-6 bg-white rounded-lg shadow-md">
      <h3 class="text-4xl font-bold">
        TalkType<AppSuffix />
      </h3>
      <p class="text-gray-600">Default suffix with no customization</p>
      
      <pre class="mt-4 p-3 bg-gray-100 rounded text-sm overflow-x-auto">
&lt;h1 class="text-4xl font-bold"&gt;
  TalkType&lt;AppSuffix /&gt;
&lt;/h1&gt;</pre>
    </div>
  </section>
  
  <section class="mb-10">
    <h2 class="text-xl font-semibold mb-4">Brand-Specific Styling</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      {#each brands as brand}
        <div class="p-6 bg-white rounded-lg shadow-md">
          <h3 class="text-3xl font-bold" style="color: {brand.color === 'inherit' ? 'inherit' : brand.color};">
            {brand.name}<AppSuffix color={brand.color} size={brand.size} />
          </h3>
          <p class="text-gray-600 mt-2">Integrated with {brand.name} branding</p>
        </div>
      {/each}
    </div>
  </section>
  
  <section class="mb-10">
    <h2 class="text-xl font-semibold mb-4">Size Variations</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="p-6 bg-white rounded-lg shadow-md">
        <h3 class="text-3xl font-bold">
          Small<AppSuffix size="50%" />
        </h3>
        <p class="text-gray-600 mt-2">size="50%"</p>
      </div>
      <div class="p-6 bg-white rounded-lg shadow-md">
        <h3 class="text-3xl font-bold">
          Medium<AppSuffix size="65%" />
        </h3>
        <p class="text-gray-600 mt-2">size="65%" (recommended)</p>
      </div>
      <div class="p-6 bg-white rounded-lg shadow-md">
        <h3 class="text-3xl font-bold">
          Large<AppSuffix size="75%" />
        </h3>
        <p class="text-gray-600 mt-2">size="75%"</p>
      </div>
    </div>
  </section>
  
  <section class="mb-10">
    <h2 class="text-xl font-semibold mb-4">Integration Examples</h2>
    
    <div class="mb-6 p-6 bg-white rounded-lg shadow-md">
      <h3 class="text-lg font-semibold mb-3">In Heading</h3>
      <div class="p-4 border border-gray-200 rounded">
        <h2 class="text-3xl font-bold">
          TalkType<AppSuffix />
        </h2>
        <p class="mt-2">Voice-to-text that doesn't suck. Spooky good, freaky fast, always free.</p>
      </div>
    </div>
    
    <div class="mb-6 p-6 bg-white rounded-lg shadow-md">
      <h3 class="text-lg font-semibold mb-3">In Navigation</h3>
      <div class="p-4 border border-gray-200 rounded">
        <nav class="flex items-center space-x-6">
          <div class="text-lg font-bold">TalkType<AppSuffix size="60%" /></div>
          <a href="#" class="text-gray-600 hover:text-gray-900">Features</a>
          <a href="#" class="text-gray-600 hover:text-gray-900">Pricing</a>
          <a href="#" class="text-gray-600 hover:text-gray-900">About</a>
        </nav>
      </div>
    </div>
    
    <div class="p-6 bg-white rounded-lg shadow-md">
      <h3 class="text-lg font-semibold mb-3">In Footer</h3>
      <div class="p-4 border border-gray-200 rounded">
        <footer class="text-sm text-gray-500">
          © 2025 TalkType<AppSuffix size="60%" /> — All rights reserved.
        </footer>
      </div>
    </div>
  </section>
  
  <section>
    <h2 class="text-xl font-semibold mb-4">Implementation Notes</h2>
    <div class="p-6 bg-white rounded-lg shadow-md prose max-w-none">
      <h3>Design Principles</h3>
      <ul>
        <li><strong>Brand Completion</strong> — The suffix is a natural continuation of the product name</li>
        <li><strong>Visual Cohesion</strong> — It uses the same font and styling as the main wordmark</li>
        <li><strong>Unifying Element</strong> — Acts as a common identifier across the Soft Stack ecosystem</li>
      </ul>
      
      <h3 class="mt-6">Usage Guidelines</h3>
      <ul>
        <li>Always use lowercase ".app" for consistency</li>
        <li>Use the same font as the main wordmark</li>
        <li>Use 65-70% size relative to the main wordmark</li>
        <li>Match the font weight to the main wordmark (usually 600)</li>
        <li>Position it inline with the main text, not as a separate element</li>
        <li>Ensure it inherits all typographic styles from the main wordmark</li>
      </ul>
    </div>
  </section>
</div>