<script>
    import { generateMemberIdentity } from './identityUtils.js';
    export let vaultHash;
    
    $: identity = generateMemberIdentity(vaultHash);
</script>

<div class="passport-card relative w-full max-w-[320px] aspect-[1.586/1] rounded-2xl p-6 shadow-2xl overflow-hidden flex flex-col justify-between text-gray-800">
    <!-- Holofoil overlay -->
    <div class="absolute inset-0 bg-white/20 opacity-30 pointer-events-none mix-blend-overlay"></div>
    
    <div class="flex justify-between items-start z-10">
        <div>
            <h3 class="text-xs font-bold uppercase tracking-widest opacity-70">Club Member</h3>
            <p class="text-lg font-black">{identity.name}</p>
        </div>
        <img src={identity.avatarUrl} alt="Member Avatar" class="w-12 h-12 rounded-full border-2 border-white/50 shadow-sm" />
    </div>

    <div class="z-10 mt-4 flex justify-between items-end">
        <p class="text-sm font-mono tracking-tighter opacity-80">{identity.memberId}</p>
        <div class="h-10 w-10 bg-white/50 rounded-lg flex items-center justify-center font-bold text-[10px]">
            QR
        </div>
    </div>
</div>

<style>
    .passport-card {
        background: linear-gradient(135deg, #fffcf5 0%, #ffcad4 100%);
        border: 1px solid rgba(255, 255, 255, 0.4);
    }
</style>