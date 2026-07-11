/** @type {import('tailwindcss').Config} */
export default {
	darkMode: ["class"],
	content: [
		"./index.html",
		"./src/**/*.{js,ts,jsx,tsx}",
	],
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				// Summer Pop type system (spec/08_DESIGN_SYSTEM.md)
				display: ['"Bricolage Grotesque Variable"', 'system-ui', 'sans-serif'],
				sans: ['"Plus Jakarta Sans Variable"', 'system-ui', 'sans-serif'],
				label: ['"Space Grotesk Variable"', 'system-ui', 'sans-serif']
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			colors: {
				// Summer Pop raw accents (Citrus & Sea)
				pop: {
					zest: '#ffd700',
					'zest-deep': '#b89b00',
					sea: '#006875',
					'sea-bright': '#00e3fd',
					'sea-mist': '#9cf0ff',
					lime: '#67e100',
					'lime-bright': '#72f700',
					charcoal: '#161d1f'
				},
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				chart: {
					'1': 'hsl(var(--chart-1))',
					'2': 'hsl(var(--chart-2))',
					'3': 'hsl(var(--chart-3))',
					'4': 'hsl(var(--chart-4))',
					'5': 'hsl(var(--chart-5))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'lemon-float': {
					from: {
						transform: 'translateY(0) rotate(var(--tilt, 0deg))'
					},
					to: {
						transform: 'translateY(-14px) rotate(calc(var(--tilt, 0deg) + 6deg))'
					}
				},
				'cloud-drift': {
					from: {
						transform: 'translateX(-3%)'
					},
					to: {
						transform: 'translateX(3%)'
					}
				},
				'scene-rise': {
					from: {
						opacity: '0',
						transform: 'translateY(28px)'
					},
					to: {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'blob-drift': {
					'0%': {
						transform: 'translate(0, 0) scale(1)'
					},
					'50%': {
						transform: 'translate(4rem, -2rem) scale(1.15)'
					},
					'100%': {
						transform: 'translate(-2rem, 3rem) scale(0.95)'
					}
				},
				'sun-rise': {
					from: {
						opacity: '0',
						transform: 'translateY(12%) scale(0.92)'
					},
					to: {
						opacity: '1',
						transform: 'translateY(0) scale(1)'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'lemon-float': 'lemon-float 6s ease-in-out infinite alternate',
				'blob-drift': 'blob-drift 30s ease-in-out infinite alternate',
				'cloud-drift': 'cloud-drift 24s ease-in-out infinite alternate',
				'scene-rise': 'scene-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
				'sun-rise': 'sun-rise 1.2s cubic-bezier(0.22, 1, 0.36, 1) both'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
}