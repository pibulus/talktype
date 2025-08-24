import MainContainer from './MainContainer.svelte';
import GhostContainer from './GhostContainer.svelte';
import ContentContainer from './ContentContainer.svelte';
import FooterComponent from './FooterComponent.svelte';
import Settings from '../Settings.svelte';
import PwaInstallPrompt from '../pwa/PwaInstallPrompt.svelte';
import AnimatedTitle from './AnimatedTitle.svelte';
import AudioToText from '../audio/AudioToText.svelte';
import AudioVisualizer from '../audio/AudioVisualizer.svelte';
import RecordButtonWithTimer from '../audio/RecordButtonWithTimer.svelte';
import TranscriptDisplay from '../audio/TranscriptDisplay.svelte';
import { AboutModal, ExtensionModal, IntroModal } from '../modals';

export {
	MainContainer,
	GhostContainer,
	ContentContainer,
	FooterComponent,
	Settings as SettingsModal,
	PwaInstallPrompt,
	AnimatedTitle,
	AudioToText,
	AudioVisualizer,
	RecordButtonWithTimer,
	TranscriptDisplay,
	AboutModal,
	ExtensionModal,
	IntroModal
};
