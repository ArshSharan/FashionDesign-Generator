// Fashion Inspiration Generator JavaScript
class FashionInspiration {
    constructor() {
        this.currentPrompt = '';
        this.currentImageUrl = '';
        this.lastDescription = '';
        this.serverUrl = 'http://localhost:3001'; // Connect to backend server
        this.init();
    }

    init() {
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.bindEvents());
        } else {
            this.bindEvents();
        }
        this.checkServerStatus();
    }

    bindEvents() {
        console.log('🔗 Binding events...');
        
        // Prompt buttons - fix event binding
        const promptButtons = document.querySelectorAll('.prompt-btn');
        console.log(`Found ${promptButtons.length} prompt buttons`);
        promptButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Prompt button clicked:', btn.dataset.prompt);
                this.selectPrompt(btn);
            });
        });

        // Generate image button
        const generateBtn = document.getElementById('generateImage');
        if (generateBtn) {
            generateBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Generate button clicked');
                this.generateImage();
            });
        }

        // Image actions
        const downloadBtn = document.getElementById('downloadImage');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.downloadImage();
            });
        }

        const generateAnotherBtn = document.getElementById('generateAnother');
        if (generateAnotherBtn) {
            generateAnotherBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.generateAnother();
            });
        }

        // Enter key in custom prompt
        const customPrompt = document.getElementById('customPrompt');
        if (customPrompt) {
            customPrompt.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    this.generateImage();
                }
            });
        }

        console.log('✅ Events bound successfully');
    }

    async checkServerStatus() {
        const statusElement = document.getElementById('serverStatus');
        
        try {
            const response = await fetch(`${this.serverUrl}/api/health`);
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Server is healthy:', data);
                
                if (data.hasApiKey) {
                    statusElement.className = 'status-indicator healthy';
                    statusElement.innerHTML = `
                        <i class="fas fa-check-circle"></i>
                        <span>Server connected and ready</span>
                    `;
                } else {
                    statusElement.className = 'status-indicator error';
                    statusElement.innerHTML = `
                        <i class="fas fa-exclamation-circle"></i>
                        <span>Server connected but API key missing</span>
                    `;
                    this.showError('Server is running but API key is not configured. Check your .env file.');
                }
            } else {
                statusElement.className = 'status-indicator error';
                statusElement.innerHTML = `
                    <i class="fas fa-times-circle"></i>
                    <span>Server not responding properly</span>
                `;
                this.showError('Server is not responding properly. Please check the backend.');
            }
        } catch (error) {
            console.error('❌ Server check failed:', error);
            statusElement.className = 'status-indicator error';
            statusElement.innerHTML = `
                <i class="fas fa-times-circle"></i>
                <span>Cannot connect to server</span>
            `;
            this.showError('Cannot connect to server. Please make sure the backend is running on port 3001.');
        }
    }

    selectPrompt(button) {
        // Remove selection from other buttons
        document.querySelectorAll('.prompt-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Select current button
        button.classList.add('selected');
        
        // Set the prompt
        this.currentPrompt = button.dataset.prompt;
        console.log('✅ Selected prompt:', this.currentPrompt);
        
        // Clear custom prompt
        const customPromptField = document.getElementById('customPrompt');
        if (customPromptField) {
            customPromptField.value = '';
        }
    }

    async generateImage() {
        // Get prompt
        const customPrompt = document.getElementById('customPrompt').value.trim();
        const finalPrompt = customPrompt || this.currentPrompt;

        if (!finalPrompt) {
            this.showError('Please select a prompt category or enter your own design idea');
            return;
        }

        console.log('🎨 Generating image for prompt:', finalPrompt);
        
        // Enhance prompt for better fashion results
        const enhancedPrompt = this.createFashionPrompt(finalPrompt);
        
        this.showLoading(true);
        this.hideError();
        this.hideImageContainer();

        try {
            const response = await fetch(`${this.serverUrl}/api/generate-image`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: enhancedPrompt
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success && data.imageUrl) {
                console.log('✅ Image generated:', data.source);
                console.log('🔗 Image URL:', data.imageUrl.substring(0, 100) + '...');
                if (data.message) {
                    console.log('ℹ️', data.message);
                }
                if (data.fullDescription) {
                    console.log('📝 AI Description:', data.fullDescription.substring(0, 200) + '...');
                }
                this.showImage(data.imageUrl, finalPrompt, data.source);
            } else {
                throw new Error('No image URL returned from server');
            }
            
        } catch (error) {
            console.error('❌ Generation error:', error);
            this.showError(`Failed to generate image: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    createFashionPrompt(originalPrompt) {
        // Create a detailed fashion-focused prompt following Imagen best practices
        const fashionEnhancements = [
            "high-quality fashion photography",
            "professional studio lighting", 
            "detailed textile patterns and textures",
            "modern fashion design"
        ];

        // Photography-specific modifiers for better results
        const photographyStyle = "studio photo, natural lighting, portrait style";
        
        // Quality modifiers as recommended by Imagen guide
        const qualityModifiers = "stylized, elegant, beautiful, high-quality";
        
        // Weaver-specific context
        const weaverContext = "suitable for handloom weaving inspiration, textile design";
        
        // Combine everything with proper structure (Subject + Context + Style)
        const enhancedPrompt = `${originalPrompt}, ${weaverContext}, ${photographyStyle}, ${qualityModifiers}, ${fashionEnhancements.slice(0, 3).join(', ')}`;
        
        // Ensure we don't exceed Imagen's 480 token limit
        const maxLength = 400; // Conservative limit to account for token vs character differences
        return enhancedPrompt.length > maxLength ? 
               enhancedPrompt.substring(0, maxLength).trim() : 
               enhancedPrompt;
    }

    showImage(imageUrl, prompt, source = 'generated') {
        console.log('🖼️ showImage called with URL:', imageUrl.substring(0, 60) + '...');
        console.log('🔍 Looking for DOM elements...');
        
        const imageContainer = document.getElementById('imageContainer');
        const generatedImage = document.getElementById('generatedImage');
        const usedPrompt = document.getElementById('usedPrompt');
        
        console.log('🔍 Found elements:', {
            imageContainer: !!imageContainer,
            generatedImage: !!generatedImage,
            usedPrompt: !!usedPrompt
        });

        if (!imageContainer || !generatedImage || !usedPrompt) {
            console.error('❌ Missing DOM elements!');
            console.log('imageContainer:', imageContainer);
            console.log('generatedImage:', generatedImage);
            console.log('usedPrompt:', usedPrompt);
            return;
        }

        // Store the image URL for download functionality
        this.currentImageUrl = imageUrl;
        
        generatedImage.src = imageUrl;
        generatedImage.onload = () => {
            console.log('🖼️ Image loaded successfully!');
            console.log('📐 Image dimensions:', generatedImage.naturalWidth, 'x', generatedImage.naturalHeight);
            
            // Show the AI description or prompt
            if (prompt.includes('This is a test description')) {
                // It's a test description, show it simply
                usedPrompt.textContent = prompt;
            } else {
                // It's a real AI description, format it nicely
                usedPrompt.innerHTML = `<strong>🎨 AI Design Brief:</strong><br><div style="margin-top: 10px; line-height: 1.6; white-space: pre-wrap;">${prompt}</div>`;
            }
            
            // Force image container to be visible and disable animation
            imageContainer.classList.remove('hidden');
            imageContainer.style.display = 'block';
            imageContainer.style.visibility = 'visible';
            imageContainer.style.opacity = '1';
            imageContainer.style.transform = 'translateY(0)';
            imageContainer.style.animation = 'none'; // Disable CSS animation that was interfering
            
            console.log('🎯 Image container made visible');
            console.log('🔍 Container opacity:', getComputedStyle(imageContainer).opacity);
        };

        generatedImage.onerror = () => {
            console.error('❌ Image failed to load:', imageUrl.substring(0, 50) + '...');
            this.showError('Unable to load image. Please try again.');
            this.showLoading(false);
        };
    }

    downloadImage() {
        if (!this.currentImageUrl) {
            this.showError('No image available for download');
            return;
        }

        try {
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
            link.download = `fashion-inspiration-${timestamp}.png`;
            link.href = this.currentImageUrl;
            
            // Add to DOM temporarily for Firefox compatibility
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showSuccess('Image downloaded successfully!');
        } catch (error) {
            console.error('Download error:', error);
            this.showError('Failed to download image. Please try right-clicking and saving.');
        }
    }

    generateAnother() {
        this.generateImage();
    }

    showLoading(show) {
        const loading = document.getElementById('loadingSpinner');
        if (loading) {
            if (show) {
                loading.classList.remove('hidden');
            } else {
                loading.classList.add('hidden');
            }
        }
    }

    hideImageContainer() {
        const container = document.getElementById('imageContainer');
        if (container) {
            container.classList.add('hidden');
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        if (errorDiv && errorText) {
            errorText.textContent = message;
            errorDiv.classList.remove('hidden');
        }
        console.error('❌ Error:', message);
    }

    hideError() {
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.classList.add('hidden');
        }
    }

    showSuccess(message) {
        // Create a temporary success message
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.style.cssText = `
            background: #c6f6d5;
            color: #22543d;
            padding: 15px;
            border-radius: 8px;
            margin: 10px 0;
            text-align: center;
            animation: fadeIn 0.3s ease-out;
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
        `;
        successDiv.textContent = message;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 3001);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Fashion Inspiration Generator...');
    new FashionInspiration();
});

// Also handle if script loads after DOM is ready
if (document.readyState !== 'loading') {
    console.log('🚀 Initializing Fashion Inspiration Generator (DOM already ready)...');
    new FashionInspiration();
}

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FashionInspiration };
}