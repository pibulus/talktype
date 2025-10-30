const message =
	'sharp is disabled for TalkType: image processing features are not available in this environment.';

const unsupported = (method = 'sharp') => {
	throw new Error(`${message}${method === 'sharp' ? '' : ` (method: ${method})`}`);
};

function createStubInstance() {
	return {
		metadata: () => unsupported('metadata'),
		rotate: () => unsupported('rotate'),
		raw: () => unsupported('raw'),
		toBuffer: () => unsupported('toBuffer'),
		extend: () => unsupported('extend'),
		extract: () => unsupported('extract'),
		affine: () => unsupported('affine'),
		resize: () => unsupported('resize'),
		toFile: () => unsupported('toFile')
	};
}

function sharpStub() {
	return createStubInstance();
}

sharpStub.simd = () => unsupported('simd');
sharpStub.cache = () => unsupported('cache');
sharpStub.concurrency = () => unsupported('concurrency');
sharpStub.threads = () => unsupported('threads');

sharpStub.default = sharpStub;
sharpStub.__esModule = true;

export default sharpStub;
