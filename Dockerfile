FROM debian:bookworm-slim as qgis

# os=ubuntu release=noble /bin/sh -c apt update && apt install -y gnupg wget software-properties-common 
# &&     wget -qO - https://qgis.org/downloads/qgis-2022.gpg.key | gpg --no-default-keyring --keyring gnupg-ring:/etc/apt/trusted.gpg.d/qgis-archive.gpg --import &&    
#  chmod a+r /etc/apt/trusted.gpg.d/qgis-archive.gpg &&     add-apt-repository "deb https://qgis.org/${os} ${release} main" &&    
#   apt update &&     DEBIAN_FRONTEND=noninteractive 
#   apt-get install -y python3-pip qgis python3-qgis python3-qgis-common python3-venv       python3-pytest python3-mock xvfb qttools5-dev-tools 
#   &&     apt-get clean # buildkit

ENV LANG=en_EN.UTF-8

RUN apt-get update \
    && apt-get install --no-install-recommends --no-install-suggests --allow-unauthenticated -y \
        gnupg \
        ca-certificates \
        wget \
        locales \
    && localedef -i en_US -f UTF-8 en_US.UTF-8 \
    # Add the current key for package downloading
    # Please refer to QGIS install documentation (https://www.qgis.org/fr/site/forusers/alldownloads.html#debian-ubuntu)
    && mkdir -m755 -p /etc/apt/keyrings \
    && wget -O /etc/apt/keyrings/qgis-archive-keyring.gpg https://download.qgis.org/downloads/qgis-archive-keyring.gpg \
    # Add repository for latest version of qgis-server
    # Please refer to QGIS repositories documentation if you want other version (https://qgis.org/en/site/forusers/alldownloads.html#repositories)
    && echo "deb [signed-by=/etc/apt/keyrings/qgis-archive-keyring.gpg] https://qgis.org/debian bookworm main" | tee /etc/apt/sources.list.d/qgis.list \
    && apt-get update \
    && apt-get install --no-install-recommends --no-install-suggests --allow-unauthenticated -y \
        python3-pip qgis python3-qgis python3-qgis-common python3-venv python3-pytest python3-mock qttools5-dev-tools \
        spawn-fcgi \
        xauth \
        xvfb \
        unzip \
        vim \
    && rm -rf /var/lib/apt/lists/*


RUN useradd -m qgis

ENV TINI_VERSION v0.19.0
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini

ENV QGIS_PREFIX_PATH /usr
ENV QGIS_SERVER_LOG_STDERR 1
ENV QGIS_SERVER_LOG_LEVEL 2

# COPY cmd.sh /home/qgis/cmd.sh
# RUN chmod -R 777 /home/qgis/cmd.sh
# RUN chown qgis:qgis /home/qgis/cmd.sh

USER qgis
WORKDIR /home/qgis

ENV QT_QPA_PLATFORM offscreen
RUN mkdir -p ~/.local/share/QGIS/QGIS3/profiles/default/python/plugins/
RUN wget https://github.com/fire2a/fire-analytics-qgis-processing-toolbox-plugin/releases/download/v0.1.25-beta/fireanalyticstoolbox_v0.1.25-beta.zip -O ~/.local/share/QGIS/QGIS3/profiles/default/python/plugins/fire2a.zip && cd ~/.local/share/QGIS/QGIS3/profiles/default/python/plugins && unzip fire2a.zip && rm -f fire2a.zip && mv fireanalyticstoolbox fire2a
RUN pip3 install --break-system-packages -r ~/.local/share/QGIS/QGIS3/profiles/default/python/plugins/fire2a/requirements.txt
RUN qgis_process plugins enable fire2a

# ENTRYPOINT ["/tini", "--"]

FROM alpine:3.19 as base
RUN apk add --no-cache build-base eigen-dev boost-dev tiff-dev aws-cli
RUN apk add nodejs npm
RUN npm install --global yarn
COPY Cell2Fire /usr/local/Cell2Fire
WORKDIR /usr/local/Cell2Fire
RUN make clean -f makefile.alpine
RUN make install -f makefile.alpine

COPY aws /usr/local/Cell2FireWrapper
WORKDIR /usr/local/Cell2FireWrapper
RUN yarn && yarn build

ENTRYPOINT ["node", "/usr/local/Cell2FireWrapper/build/wrapper"]