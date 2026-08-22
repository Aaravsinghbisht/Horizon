# Local eve sandbox image with Browser Use browser-harness pre-installed.
FROM ghcr.io/vercel/eve:latest

USER vercel-sandbox
ENV PATH="/home/vercel-sandbox/.local/bin:${PATH}"

RUN curl -LsSf https://astral.sh/uv/install.sh | sh \
  && uv tool install --python 3.12 browser-harness \
  && ln -sf "$(command -v browser-harness)" /home/vercel-sandbox/.local/bin/browser-use
