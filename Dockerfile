FROM plone/plone-backend:6.0.0a2

LABEL maintainer="Plone Release Team <releaseteam@plone.org>" \
      org.label-schema.name="plone.app.mosaic" \
      org.label-schema.description="plone.app.mosaic CMS Plone Site" \
      org.label-schema.vendor="Plone Foundation" \
      org.label-schema.docker.cmd="docker run -d -p 8080:8080 plone/plone.app.mosaic:latest"

# Add local code
COPY . ./
RUN apt-get update \
    && apt-get -y upgrade -y \
    && apt-get -y install make \
    && make VENV=off VENV_FOLDER=. install
